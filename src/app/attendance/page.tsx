export const dynamic = 'force-dynamic';


"use client";

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useEffect, useState, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [isFiltering, setIsFiltering] = useState(false);
  
  // Data state
  const [rawLogs, setRawLogs] = useState<AttendanceLog[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedAttendance[]>([]);
  const [users, setUsers] = useState<Tables<'users'>[]>([]);

  // Filter state - default to last 30 days
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  const fetchAttendanceData = useCallback(async () => {
    setIsFiltering(true);
    try {
      let query = supabase.from('attendance')
        .select('*, users(name)')
        .not('session_duration', 'is', null);

      if (date?.from) {
        query = query.gte('work_date', format(startOfDay(date.from), 'yyyy-MM-dd'));
        const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
        query = query.lte('work_date', format(toDate, 'yyyy-MM-dd'));
      } else {
         const defaultFrom = subDays(new Date(), 29);
         const defaultTo = new Date();
         query = query.gte('work_date', format(startOfDay(defaultFrom), 'yyyy-MM-dd'));
         query = query.lte('work_date', format(endOfDay(defaultTo), 'yyyy-MM-dd'));
      }

      if (selectedUser) {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query
        .order('work_date', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setRawLogs((data as AttendanceLog[]) || []);

    } catch (error: any) {
      toast({ title: "خطأ في جلب السجلات", description: error.message, variant: 'destructive' });
    } finally {
      setIsFiltering(false);
    }
  }, [date, selectedUser, toast]);

  // Initial data fetch for users list and the first report
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: usersData, error: usersError } = await supabase.from('users').select('*').order('name');
        if (usersError) throw usersError;
        setUsers(usersData || []);
        
        await fetchAttendanceData();

      } catch (error: any) {
        toast({ title: "خطأ في جلب البيانات الأولية", description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time subscription for any changes in the attendance table
  useEffect(() => {
    const channel = supabase
      .channel('public:attendance')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => {
          fetchAttendanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAttendanceData]);

  // Data aggregation logic to sum up daily totals
  useEffect(() => {
    const dailyTotals: { [key: string]: AggregatedAttendance } = {};
    
    rawLogs.forEach(log => {
      if (!log.user_id || !log.work_date || !log.users?.name) return;
      const key = `${log.user_id}-${log.work_date}`;
      if (!dailyTotals[key]) {
        dailyTotals[key] = {
          userId: log.user_id,
          userName: log.users.name,
          workDate: log.work_date,
          totalDuration: 0,
        };
      }
      dailyTotals[key].totalDuration += log.session_duration || 0;
    });

    const sortedData = Object.values(dailyTotals).sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
    setAggregatedData(sortedData);
  }, [rawLogs]);
  
  const exportToCsv = () => {
    const headers = "Date,Employee,Total Hours Worked\n";
    const rows = aggregatedData.map(log => {
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
    const mins = Math.floor(minutes % 60); // Use floor to avoid fractional minutes
    return `${hours} س ${mins} د`;
  }

  if (loading) {
    return (
      <AppLayout allowedRoles={['admin', 'manager']}>
         <div className="flex justify-center items-center h-[calc(100vh-200px)]">
            <Loader2 className="h-8 w-8 animate-spin" />
         </div>
      </AppLayout>
    );
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
        <Button onClick={exportToCsv} disabled={aggregatedData.length === 0}>
          <Download />
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
                  <CalendarIcon />
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
             <Button onClick={fetchAttendanceData} disabled={isFiltering}>
                {isFiltering && <Loader2 className="h-4 w-4 animate-spin" />}
                تطبيق الفلاتر
             </Button>
          </div>
        </CardHeader>
        <CardContent>
            {rawLogs.length === 1000 && (
                <Alert variant="default" className="mb-4 bg-amber-100 border-amber-300 text-amber-800">
                    <AlertCircle className="h-4 w-4 !text-amber-800" />
                    <AlertTitle>تم الوصول إلى الحد الأقصى للنتائج</AlertTitle>
                    <AlertDescription>
                        يتم عرض أحدث 1000 سجل فقط. للحصول على نتائج أكثر دقة، يرجى استخدام الفلاتر لتضييق نطاق البحث.
                    </AlertDescription>
                </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الموظف</TableHead>
                  <TableHead>تاريخ العمل</TableHead>
                  <TableHead className="text-end">إجمالي ساعات العمل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedData.length > 0 ? aggregatedData.map((log) => (
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
        </CardContent>
      </Card>
    </AppLayout>
  );
}
