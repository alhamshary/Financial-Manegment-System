
"use client";
import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Users, Wrench, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

// Define combined types for easier handling
type EmployeeServiceLog = (Tables<'orders'> & { 
  services: Pick<Tables<'services'>, 'name'> | null, 
  clients: Pick<Tables<'clients'>, 'name'> | null 
});

type AdminServiceLog = (Tables<'orders'> & {
  users: Pick<Tables<'users'>, 'name'> | null;
  services: Pick<Tables<'services'>, 'name'> | null;
  clients: Pick<Tables<'clients'>, 'name'> | null;
});

function SessionTimerCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchActiveSession = async () => {
      setLoading(true);
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

      if (error && error.code !== 'PGRST116') { // Ignore "No rows found"
        toast({ title: "Error fetching session", description: error.message, variant: 'destructive' });
      } else if (data) {
        setSessionStartTime(data.check_in);
      }
      setLoading(false);
    };

    fetchActiveSession();
  }, [user, toast]);

  useEffect(() => {
    if (!sessionStartTime) {
      setSessionDuration('00:00:00');
      return;
    }

    const timer = setInterval(() => {
      const start = new Date(sessionStartTime).getTime();
      const now = new Date().getTime();
      const difference = now - start;

      if (difference < 0) {
        setSessionDuration('00:00:00');
        clearInterval(timer);
        return;
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setSessionDuration(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStartTime]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Session Duration</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
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

  const todayIso = new Date().toISOString().split('T')[0];

  const fetchEmployeeData = async () => {
    if (!user) return;
    setLoadingServices(true);

    const todayStart = `${todayIso}T00:00:00.000Z`;
    const todayEnd = `${todayIso}T23:59:59.999Z`;

    // Fetch services
    const { data: servicesData, error: servicesError } = await supabase
      .from('orders')
      .select('*, services(name), clients(name)')
      .eq('user_id', user.id)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .order('created_at', { ascending: false });
    
    if (servicesError) {
      toast({ title: "Error fetching services", description: servicesError.message, variant: 'destructive' });
    } else {
      setServicesToday((servicesData as any) || []);
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
          <CardTitle>Your Services Today</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingServices ? (
                 <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : servicesToday.length > 0 ? servicesToday.map(log => {
                return (
                  <TableRow key={log.id}>
                    <TableCell>{log.services?.name || 'N/A'}</TableCell>
                    <TableCell>{log.clients?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">${(log.total ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">No services submitted today.</TableCell>
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
  
  const todayIso = new Date().toISOString().split('T')[0];

  const fetchAdminData = async () => {
    setLoading(true);

    const todayStart = `${todayIso}T00:00:00.000Z`;
    const todayEnd = `${todayIso}T23:59:59.999Z`;

    try {
      const [ordersRes, totalUsersRes, todaysAttendanceRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, users(name), services(name), clients(name)')
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

      const ordersData = (ordersRes.data as any) || [];
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
        toast({ title: "Error fetching dashboard data", description: error.message, variant: 'destructive' });
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
            <CardTitle className="text-sm font-medium">Total Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">Based on today's logs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Sold Today</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">+{stats.servicesSold}</div>}
             <p className="text-xs text-muted-foreground">Total services performed</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.activeEmployees} / {stats.totalEmployees}</div>}
             <p className="text-xs text-muted-foreground">Employees with attendance today</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Work Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.avgWorkHours.toFixed(1)}h</div>}
             <p className="text-xs text-muted-foreground">Average per employee today</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Services Submitted Today</CardTitle>
        </CardHeader>
        <CardContent>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : logs.length > 0 ? logs.map(log => {
                return (
                  <TableRow key={log.id}>
                    <TableCell>{log.users?.name || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{log.services?.name || 'N/A'}</Badge></TableCell>
                    <TableCell>{log.clients?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">${(log.total ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No services submitted today.</TableCell>
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Here's your overview.
          </p>
        </div>

        {user?.role === 'employee' && <EmployeeDashboard />}
        {(user?.role === 'admin' || user?.role === 'manager') && <AdminManagerDashboard />}
      </div>
    </AppLayout>
  );
}
