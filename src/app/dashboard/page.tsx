
"use client";
import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Users, Wrench, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

// Define combined types for easier handling
type EmployeeServiceLog = {
  id: number;
  total: number | null;
  services: Pick<Tables<'services'>, 'name'> | null;
  clients: Pick<Tables<'clients'>, 'name'> | null;
};

type AdminServiceLog = {
  id: number;
  total: number | null;
  users: Pick<Tables<'users'>, 'name'> | null;
  services: Pick<Tables<'services'>, 'name'> | null;
  clients: Pick<Tables<'clients'>, 'name'> | null;
};

function SessionTimerCard() {
  const { sessionDuration, isSessionLoading } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>مدة الجلسة الحالية</CardTitle>
      </CardHeader>
      <CardContent>
        {isSessionLoading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <div className="text-4xl font-bold tracking-wider">{sessionDuration}</div>
        )}
      </CardContent>
    </Card>
  );
}


function EmployeeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [servicesToday, setServicesToday] = useState<EmployeeServiceLog[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const fetchEmployeeData = async () => {
    if (!user) return;
    setLoadingServices(true);

    const todayIso = new Date().toISOString().split('T')[0];
    const todayStart = `${todayIso}T00:00:00.000Z`;
    const todayEnd = `${todayIso}T23:59:59.999Z`;

    // Fetch services
    const { data: servicesData, error: servicesError } = await supabase
      .from('orders')
      .select('id, total, services(name), clients(name)')
      .eq('user_id', user.id)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .order('created_at', { ascending: false });
    
    if (servicesError) {
      toast({ title: "خطأ في جلب الخدمات", description: servicesError.message, variant: 'destructive' });
    } else {
      setServicesToday((servicesData as EmployeeServiceLog[]) || []);
    }
    setLoadingServices(false);
  };
  
  useEffect(() => {
    fetchEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="grid gap-6">
      <SessionTimerCard />
      <Card>
        <CardHeader>
          <CardTitle>خدماتك اليوم</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الخدمة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead className="text-end">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingServices ? (
                 <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : servicesToday.length > 0 ? servicesToday.map(log => {
                return (
                  <TableRow key={log.id}>
                    <TableCell>{log.services?.name || 'غير متوفر'}</TableCell>
                    <TableCell>{log.clients?.name || 'غير متوفر'}</TableCell>
                    <TableCell className="text-end">${(log.total ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">لم يتم تقديم أي خدمات اليوم.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function AdminManagerDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    servicesSold: 0,
    activeEmployees: 0,
    totalEmployees: 0,
    avgWorkHours: 0,
  });
  const [logs, setLogs] = useState<AdminServiceLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchAdminData = async () => {
    setLoading(true);

    const todayIso = new Date().toISOString().split('T')[0];
    const todayStart = `${todayIso}T00:00:00.000Z`;
    const todayEnd = `${todayIso}T23:59:59.999Z`;

    try {
      const [ordersRes, totalUsersRes, todaysAttendanceRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total, users(name), services(name), clients(name)')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd)
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true }),
        // Single query for all of today's attendance records
        supabase
          .from('attendance')
          .select('user_id, session_duration')
          .eq('work_date', todayIso)
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (totalUsersRes.error) throw totalUsersRes.error;
      if (todaysAttendanceRes.error) throw todaysAttendanceRes.error;

      const ordersData = (ordersRes.data as AdminServiceLog[]) || [];
      setLogs(ordersData);
      
      const totalRevenue = ordersData.reduce((acc: number, log: any) => acc + (log.total || 0), 0);
      const servicesSold = ordersData.length;

      const todaysAttendanceData = todaysAttendanceRes.data || [];

      // Correctly calculate active employees as unique users with any attendance today
      const activeEmployees = new Set(todaysAttendanceData.map(a => a.user_id)).size;
      
      const totalEmployees = totalUsersRes.count || 0;

      // Calculate average work hours from completed sessions
      const completedSessions = todaysAttendanceData.filter(a => a.session_duration);
      const totalMinutes = completedSessions.reduce((acc, item) => acc + (item.session_duration || 0), 0);
      const employeesWhoWorked = new Set(completedSessions.map(a => a.user_id)).size;
      const avgWorkHours = employeesWhoWorked > 0 ? (totalMinutes / 60) / employeesWhoWorked : 0;
      
      setStats({
        totalRevenue,
        servicesSold,
        activeEmployees,
        totalEmployees,
        avgWorkHours
      });

    } catch (error: any) {
        toast({ title: "خطأ في جلب بيانات لوحة التحكم", description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-6">
       <SessionTimerCard />
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات اليوم</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">بناءً على سجلات اليوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الخدمات المباعة اليوم</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">+{stats.servicesSold}</div>}
             <p className="text-xs text-muted-foreground">إجمالي الخدمات المقدمة</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الموظفون النشطون</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.activeEmployees} / {stats.totalEmployees}</div>}
             <p className="text-xs text-muted-foreground">الموظفون الحاضرون اليوم</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط ساعات العمل</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.avgWorkHours.toFixed(1)} س</div>}
             <p className="text-xs text-muted-foreground">المتوسط لكل موظف اليوم</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>جميع الخدمات المقدمة اليوم</CardTitle>
        </CardHeader>
        <CardContent>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>الخدمة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead className="text-end">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : logs.length > 0 ? logs.map(log => {
                return (
                  <TableRow key={log.id}>
                    <TableCell>{log.users?.name || 'غير متوفر'}</TableCell>
                    <TableCell><Badge variant="outline">{log.services?.name || 'غير متوفر'}</Badge></TableCell>
                    <TableCell>{log.clients?.name || 'غير متوفر'}</TableCell>
                    <TableCell className="text-end">${(log.total ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">لم يتم تقديم أي خدمات اليوم.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent rendering on the server to avoid hydration errors from new Date() in children
  if (!isMounted) {
    return (
       <AppLayout>
         <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
         </div>
       </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-muted-foreground">
            مرحباً بعودتك، {user?.name}. إليك نظرة عامة.
          </p>
        </div>

        {user?.role === 'employee' && <EmployeeDashboard />}
        {(user?.role === 'admin' || user?.role === 'manager') && <AdminManagerDashboard />}
      </div>
    </AppLayout>
  );
}
