
"use client";

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, DollarSign, Wrench, Users as UsersIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useEffect, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { useToast } from "@/hooks/use-toast";

// Define combined type for easier handling
type OrderLog = Tables<'orders'> & {
  users: Tables<'users'> | null;
  services: Tables<'services'> | null;
  clients: Tables<'clients'> | null;
};


export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [allLogs, setAllLogs] = useState<OrderLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<OrderLog[]>([]);
  const [users, setUsers] = useState<Tables<'users'>[]>([]);
  const [services, setServices] = useState<Tables<'services'>[]>([]);

  // Filter state
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, usersData, servicesData] = await Promise.all([
        supabase.from('orders').select('*, users(*), services(*), clients(*)').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('name'),
        supabase.from('services').select('*').order('name'),
      ]);

      if (logsData.error) throw logsData.error;
      if (usersData.error) throw usersData.error;
      if (servicesData.error) throw servicesData.error;
      
      const logs = (logsData.data as any[]) || [];
      setAllLogs(logs);
      setFilteredLogs(logs); // Initially show all
      setUsers(usersData.data || []);
      setServices(servicesData.data || []);

    } catch (error: any) {
      toast({ title: "Error fetching data", description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleApplyFilters = () => {
    let logs = [...allLogs];

    // Filter by date range
    if (date?.from) {
      const interval = {
        start: startOfDay(date.from),
        end: date.to ? endOfDay(date.to) : endOfDay(date.from),
      };
      logs = logs.filter(log => log.created_at && isWithinInterval(new Date(log.created_at), interval));
    }

    // Filter by employee
    if (selectedEmployee) {
      logs = logs.filter(log => log.user_id === selectedEmployee);
    }

    // Filter by service
    if (selectedService) {
      logs = logs.filter(log => log.service_id.toString() === selectedService);
    }

    setFilteredLogs(logs);
  };
  
  const summaryStats = useMemo(() => {
    const totalRevenue = filteredLogs.reduce((acc, log) => acc + (log.total ?? 0), 0);
    const totalServices = filteredLogs.length;
    
    const servicesByRole = filteredLogs.reduce((acc, log) => {
        if(log.users?.role) {
            const role = log.users.role;
            acc[role] = (acc[role] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return { totalRevenue, totalServices, servicesByRole };
  }, [filteredLogs]);

  const exportToCsv = () => {
    const headers = "Date,Employee,Service,Client Name,Client Phone,Revenue\n";
    const rows = filteredLogs.map(log => {
      const logDate = log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd") : "N/A";
      const employee = log.users?.name || "N/A";
      const service = log.services?.name || "N/A";
      const client = log.clients?.name || "N/A";
      const clientPhone = log.clients?.phone || "N/A";
      const revenue = (log.total ?? 0).toFixed(2);
      return `${logDate},"${employee}","${service}","${client}",${clientPhone},${revenue}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "revenue_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout allowedRoles={['admin', 'manager']}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export detailed revenue reports.
          </p>
        </div>
        <Button onClick={exportToCsv} disabled={loading || filteredLogs.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export as CSV
        </Button>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Based on current filters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{summaryStats.totalServices}</div>
             <p className="text-xs text-muted-foreground">Based on current filters</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services by Employees</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.servicesByRole['employee'] || 0}</div>
             <p className="text-xs text-muted-foreground">Completed by employees</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services by Staff</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summaryStats.servicesByRole['admin'] || 0) + (summaryStats.servicesByRole['manager'] || 0)}</div>
             <p className="text-xs text-muted-foreground">Admins & Managers</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Select value={selectedEmployee} onValueChange={(value) => setSelectedEmployee(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedService} onValueChange={(value) => setSelectedService(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Service" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="all">All Services</SelectItem>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
             <Button onClick={handleApplyFilters} disabled={loading}>Apply Filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Client Phone</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.created_at ? format(new Date(log.created_at), 'PPP') : 'N/A'}</TableCell>
                      <TableCell className="font-medium">{log.users?.name || 'N/A'}</TableCell>
                      <TableCell>{log.services?.name || 'N/A'}</TableCell>
                      <TableCell>{log.clients?.name || 'N/A'}</TableCell>
                      <TableCell>{log.clients?.phone || 'N/A'}</TableCell>
                      <TableCell className="text-right">${(log.total ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">No results found for the selected filters.</TableCell>
                    </TableRow>
                  )
                }
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
