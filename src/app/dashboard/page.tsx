
"use client";
import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Users, Wrench, Loader2, ShoppingBag, Wallet } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { startOfDay, endOfDay, format } from "date-fns";


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
  payment_method: 'cash' | 'wallet';
  users: Pick<Tables<'users'>, 'name'> | null;
  services: Pick<Tables<'services'>, 'name'> | null;
  clients: Pick<Tables<'clients'>, 'name'> | null;
};

function SessionInfoCard() {
  const { user } = useAuth();
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
        setIsLoading(false);
        return;
    };

    const fetchActiveSession = async () => {
        setIsLoading(true);
        const todayIso = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('attendance')
            .select('check_in')
            .eq('user_id', user.id)
            .eq('work_date', todayIso)
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)
            .single();

        if (data?.check_in) {
            setCheckInTime(format(new Date(data.check_in), 'p')); // e.g., "10:30 AM"
        } else if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
             console.error("Error fetching check-in time:", error.message);
        }
        setIsLoading(false);
    };
    
    fetchActiveSession();
  }, [user?.id]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>وقت بدء الجلسة</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : checkInTime ? (
          <div className="text-4xl font-bold tracking-wider">{checkInTime}</div>
        ) : (
          <div className="text-lg text-muted-foreground">لم يتم بدء أي جلسة</div>
        )}
      </CardContent>
    </Card>
  );
}


function EmployeeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [servicesToday, setServicesToday] = useState<EmployeeServiceLog[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalExpenses: 0 });
  const [loading, setLoading] = useState(true);
  const lastFetchedDateRef = useRef<string | null>(null);

  const fetchEmployeeData = useCallback(async () => {
    if (!user) return;
    
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();

    try {
      const [servicesRes, expensesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total, services(name), clients(name)')
          .eq('user_id', user.id)
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd)
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd)
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const servicesData = (servicesRes.data as EmployeeServiceLog[]) || [];
      const totalRevenue = servicesData.reduce((acc, log) => acc + (log.total ?? 0), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, expense) => sum + expense.amount, 0);

      setServicesToday(servicesData);
      setStats({ totalRevenue, totalExpenses });
      lastFetchedDateRef.current = format(new Date(), "yyyy-MM-dd");
    } catch (error: any) {
        toast({ title: "خطأ في جلب بيانات لوحة التحكم", description: error.message, variant: 'destructive' });
    }
  }, [user, toast]);
  
  // Initial data fetch
  useEffect(() => {
    if (user) {
        setLoading(true);
        fetchEmployeeData().finally(() => setLoading(false));
    }
  }, [user, fetchEmployeeData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;
    const channels = [
      supabase
        .channel(`employee-dashboard-orders-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
          () => fetchEmployeeData()
        )
        .subscribe(),
      supabase
        .channel(`employee-dashboard-expenses-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'expenses', filter: `user_id=eq.${user.id}` },
          () => fetchEmployeeData()
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, fetchEmployeeData]);

  // Fetch data on visibility change if date has changed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        if (lastFetchedDateRef.current && lastFetchedDateRef.current !== todayStr) {
          setLoading(true);
          fetchEmployeeData().finally(() => setLoading(false));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchEmployeeData]);

  const netAmount = stats.totalRevenue - stats.totalExpenses;

  return (
    <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SessionInfoCard />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي إيراداتك اليوم</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي مصاريفك اليوم</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold text-destructive">${stats.totalExpenses.toFixed(2)}</div>}
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">صافي المبلغ</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-primary' : 'text-destructive'}`}>${netAmount.toFixed(2)}</div>}
                </CardContent>
            </Card>
        </div>

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
              {loading ? (
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
    totalExpenses: 0,
    netRevenue: 0,
  });
  const [logs, setLogs] = useState<AdminServiceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedDateRef = useRef<string | null>(null);
  
  const fetchAdminData = useCallback(async () => {
    const now = new Date();
    const localTodayDateString = format(now, "yyyy-MM-dd");
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();

    try {
      const [ordersRes, totalUsersRes, todaysAttendanceRes, expensesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total, payment_method, users(name), services(name), clients(name)')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd)
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('attendance')
          .select('user_id, session_duration')
          .eq('work_date', localTodayDateString),
        supabase
          .from('expenses')
          .select('amount')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd)
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (totalUsersRes.error) throw totalUsersRes.error;
      if (todaysAttendanceRes.error) throw todaysAttendanceRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const ordersData = (ordersRes.data as AdminServiceLog[]) || [];
      setLogs(ordersData);
      lastFetchedDateRef.current = localTodayDateString;
      
      const totalRevenue = ordersData.reduce((acc: number, log: any) => acc + (log.total || 0), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, exp) => sum + exp.amount, 0);
      const netRevenue = totalRevenue - totalExpenses;
      const servicesSold = ordersData.length;
      const todaysAttendanceData = todaysAttendanceRes.data || [];
      const activeEmployees = new Set(todaysAttendanceData.map(a => a.user_id)).size;
      const totalEmployees = totalUsersRes.count || 0;
      const completedSessions = todaysAttendanceData.filter(a => a.session_duration);
      const totalMinutes = completedSessions.reduce((acc, item) => acc + (item.session_duration || 0), 0);
      const employeesWhoWorked = new Set(completedSessions.map(a => a.user_id)).size;
      const avgWorkHours = employeesWhoWorked > 0 ? (totalMinutes / 60) / employeesWhoWorked : 0;
      
      setStats({
        totalRevenue,
        servicesSold,
        activeEmployees,
        totalEmployees,
        avgWorkHours,
        totalExpenses,
        netRevenue
      });

    } catch (error: any) {
        toast({ title: "خطأ في جلب بيانات لوحة التحكم", description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  // Initial data fetch
  useEffect(() => {
    setLoading(true);
    fetchAdminData().finally(() => setLoading(false));
  }, [fetchAdminData]);

  // Real-time subscriptions
  useEffect(() => {
    const channels = [
      supabase
        .channel('admin-dashboard-orders')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          () => fetchAdminData()
        )
        .subscribe(),
      supabase
        .channel('admin-dashboard-expenses')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'expenses' },
          () => fetchAdminData()
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [fetchAdminData]);

  // Fetch data on visibility change if date has changed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        if (lastFetchedDateRef.current && lastFetchedDateRef.current !== todayStr) {
          setLoading(true);
          fetchAdminData().finally(() => setLoading(false));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAdminData]);


  const paymentMethodLabels = {
    cash: 'كاش',
    wallet: 'محفظة'
  };

  return (
    <div className="grid gap-6">
       <SessionInfoCard />
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">إجمالي المصاريف اليوم</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold text-destructive">${stats.totalExpenses.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">بناءً على سجلات اليوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح اليوم</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className={`text-2xl font-bold ${stats.netRevenue >= 0 ? 'text-primary' : 'text-destructive'}`}>${stats.netRevenue.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">الإيرادات - المصاريف</p>
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
                <TableHead>طريقة الدفع</TableHead>
                <TableHead className="text-end">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : logs.length > 0 ? logs.map(log => {
                return (
                  <TableRow key={log.id}>
                    <TableCell>{log.users?.name || 'غير متوفر'}</TableCell>
                    <TableCell><Badge variant="outline">{log.services?.name || 'غير متوفر'}</Badge></TableCell>
                    <TableCell>{log.clients?.name || 'غير متوفر'}</TableCell>
                    <TableCell>{paymentMethodLabels[log.payment_method]}</TableCell>
                    <TableCell className="text-end">${(log.total ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">لم يتم تقديم أي خدمات اليوم.</TableCell>
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

    