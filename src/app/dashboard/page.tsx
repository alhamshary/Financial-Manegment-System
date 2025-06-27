"use client";
import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Users, Wrench } from "lucide-react";
import { serviceLogs, services, users } from "@/lib/data";
import { useEffect, useState } from "react";

function EmployeeDashboard() {
  const { user } = useAuth();
  const userLogs = serviceLogs.filter(log => log.employeeId === user?.id && new Date(log.date).toDateString() === new Date().toDateString());

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Live Clock & Check-in/out</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-4xl font-bold">{time.toLocaleTimeString()}</div>
          <div className="flex gap-2">
            <Button variant="outline">Check In</Button>
            <Button variant="destructive">Check Out</Button>
          </div>
        </CardContent>
      </Card>
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
              {userLogs.length > 0 ? userLogs.map(log => {
                const service = services.find(s => s.id === log.serviceId);
                return (
                  <TableRow key={log.id}>
                    <TableCell>{service?.name || 'N/A'}</TableCell>
                    <TableCell>{log.clientName}</TableCell>
                    <TableCell className="text-right">${log.finalPrice.toFixed(2)}</TableCell>
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
  const todayLogs = serviceLogs.filter(log => new Date(log.date).toDateString() === new Date().toDateString());
  const totalRevenue = todayLogs.reduce((acc, log) => acc + log.finalPrice, 0);

  return (
    <div className="grid gap-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Sold Today</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{todayLogs.length}</div>
             <p className="text-xs text-muted-foreground">Total services performed</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 / 5</div>
             <p className="text-xs text-muted-foreground">Checked-in employees</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Work Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7.5h</div>
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
              {todayLogs.length > 0 ? todayLogs.map(log => {
                const service = services.find(s => s.id === log.serviceId);
                const employee = users.find(u => u.id === log.employeeId);
                return (
                  <TableRow key={log.id}>
                    <TableCell>{employee?.name || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{service?.name || 'N/A'}</Badge></TableCell>
                    <TableCell>{log.clientName}</TableCell>
                    <TableCell className="text-right">${log.finalPrice.toFixed(2)}</TableCell>
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
