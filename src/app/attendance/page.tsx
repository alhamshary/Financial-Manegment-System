
"use client";

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useEffect, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { useToast } from "@/hooks/use-toast";

// Combined type for attendance with user info
type AttendanceLog = Tables<'attendance'> & {
  users: Pick<Tables<'users'>, 'name'> | null;
};

// Type for the aggregated data we'll display
type AggregatedAttendance = {
  userId: string;
  userName: string;
  workDate: string;
  totalDuration: number; // in minutes
};

export default function AttendancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [allLogs, setAllLogs] = useState<AttendanceLog[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedAttendance[]>([]);
  const [filteredData, setFilteredData] = useState<AggregatedAttendance[]>([]);
  const [users, setUsers] = useState<Tables<'users'>[]>([]);

  // Filter state
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedUser, setSelectedUser] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attendanceData, usersData] = await Promise.all([
        supabase.from('attendance').select('*, users(name)').not('session_duration', 'is', null).order('work_date', { ascending: false }),
        supabase.from('users').select('*').order('name'),
      ]);

      if (attendanceData.error) throw attendanceData.error;
      if (usersData.error) throw usersData.error;
      
      const logs = (attendanceData.data as any[]) || [];
      setAllLogs(logs);
      setUsers(usersData.data || []);

    } catch (error: any) {
      toast({ title: "خطأ في جلب البيانات", description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize the aggregation logic
  const processAttendanceData = useMemo(() => {
    const dailyTotals: { [key: string]: AggregatedAttendance } = {};
    
    allLogs.forEach(log => {
      const key = `${log.user_id}-${log.work_date}`;
      if (!dailyTotals[key]) {
        dailyTotals[key] = {
          userId: log.user_id,
          userName: log.users?.name || 'مستخدم غير معروف',
          workDate: log.work_date,
          totalDuration: 0,
        };
      }
      dailyTotals[key].totalDuration += log.session_duration || 0;
    });

    return Object.values(dailyTotals).sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
  }, [allLogs]);

  useEffect(() => {
    setAggregatedData(processAttendanceData);
    setFilteredData(processAttendanceData); // Initially show all aggregated data
  }, [processAttendanceData]);
  
  const handleApplyFilters = () => {
    let data = [...aggregatedData];

    // Filter by date range
    if (date?.from) {
      const interval = {
        start: startOfDay(date.from),
        end: date.to ? endOfDay(date.to) : endOfDay(date.from),
      };
      data = data.filter(log => isWithinInterval(new Date(log.workDate), interval));
    }

    // Filter by employee
    if (selectedUser) {
      data = data.filter(log => log.userId === selectedUser);
    }

    setFilteredData(data);
  };

  const exportToCsv = () => {
    const headers = "Date,Employee,Total Hours Worked\n";
    const rows = filteredData.map(log => {
      const logDate = format(new Date(log.workDate), "yyyy-MM-dd");
      const employee = log.userName;
      const hours = (log.totalDuration / 60).toFixed(2);
      return `${logDate},"${employee}",${hours}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "attendance_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} س ${mins} د`;
  }

  return (
    <AppLayout allowedRoles={['admin', 'manager']}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تقرير الحضور</h1>
          <p className="text-muted-foreground">
            عرض وتصدير سجلات حضور الموظفين.
          </p>
        </div>
        <Button onClick={exportToCsv} disabled={loading || filteredData.length === 0}>
          <Download className="ml-2 h-4 w-4" />
          تصدير كـ CSV
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold">الفلاتر</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn("w-[300px] justify-start text-start font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>اختر نطاقًا زمنيًا</span>
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
            <Select value={selectedUser} onValueChange={(value) => setSelectedUser(value === 'all' ? '' : value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="تصفية حسب الموظف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموظفين</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
             <Button onClick={handleApplyFilters} disabled={loading}>تطبيق الفلاتر</Button>
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
                  <TableHead>اسم الموظف</TableHead>
                  <TableHead>تاريخ العمل</TableHead>
                  <TableHead className="text-end">إجمالي ساعات العمل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? filteredData.map((log) => (
                    <TableRow key={`${log.userId}-${log.workDate}`}>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>{format(new Date(log.workDate), 'PPP')}</TableCell>
                      <TableCell className="text-end">{formatDuration(log.totalDuration)} ({ (log.totalDuration / 60).toFixed(2) } س)</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">لم يتم العثور على نتائج للفلاتر المحددة.</TableCell>
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
