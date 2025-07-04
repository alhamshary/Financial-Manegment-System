"use client";

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  PlusCircle,
  Loader2,
  Calendar as CalendarIcon,
  DollarSign,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExpenseForm, type ExpenseFormValues } from "@/components/expense-form";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { format, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Expense = Tables<"expenses"> & {
  users: Pick<Tables<"users">, "name"> | null;
};
type User = Tables<"users">;

export default function ExpensesPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Data State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]); // For admin/manager filter

  // UI State
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);

  // Dialog State
  const [isAddOrEditDialogOpen, setIsAddOrEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  // Filter State (for admin/manager)
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [addingExpense, setAddingExpense] = useState<boolean>(false);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setIsFiltering(true);
    try {
      let query = supabase.from("expenses").select("*, users(name)");

      // Apply role-based filtering
      if (user.role === "employee") {
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();
        query = query
          .eq("user_id", user.id)
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd);
      } else {
        // Admin or Manager
        if (date?.from) {
          query = query.gte("created_at", startOfDay(date.from).toISOString());
          const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
          query = query.lte("created_at", toDate.toISOString());
        }
        if (selectedUser) {
          query = query.eq("user_id", selectedUser);
        }
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (error) throw error;
      setExpenses((data as Expense[]) || []);
    } catch (error: any) {
      toast({
        title: "خطأ في جلب المصاريف",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFiltering(false);
      setLoading(false);
    }
  }, [user, toast, date, selectedUser]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      setLoading(true);
      if (user.role === "admin" || user.role === "manager") {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("*")
          .order("name");
        if (usersError) throw usersError;
        setUsers(usersData || []);
      }
      await fetchExpenses();
    };
    fetchInitialData();
  }, [user, fetchExpenses]);

  const handleOpenAddDialog = () => {
    setEditingExpense(null);
    setIsAddOrEditDialogOpen(true);
  };

  const handleOpenEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddOrEditDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsAddOrEditDialogOpen(false);
    setEditingExpense(null);
    setDeletingExpense(null);
  };

  const handleFormSubmit = async (values: ExpenseFormValues) => {
    if (!user) return;

    const expenseData = { ...values, user_id: user.id };

    if (editingExpense) {
      const { error } = await supabase
        .from("expenses")
        .update(values)
        .eq("id", editingExpense.id);
      if (error) {
        toast({
          title: "خطأ في تحديث المصروف",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "تم تحديث المصروف بنجاح" });
        await fetchExpenses();
      }
    } else {
      try {
        if (addingExpense) return;
        setAddingExpense(true);
        const { error } = await supabase
          .from("expenses")
          .insert(expenseData as TablesInsert<"expenses">);
        if (error) {
          toast({
            title: "خطأ في إضافة المصروف",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({ title: "تمت إضافة المصروف بنجاح" });
          await fetchExpenses();
        }
      } catch (error) {
        console.error(error);
      } finally {
        setAddingExpense(false);
      }
    }
    handleCloseDialogs();
  };

  const handleDeleteExpense = async () => {
    if (deletingExpense) {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", deletingExpense.id);
      if (error) {
        toast({
          title: "خطأ في حذف المصروف",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "تم حذف المصروف بنجاح", variant: "destructive" });
        await fetchExpenses();
      }
      handleCloseDialogs();
    }
  };

  const canEditOrDelete = (expense: Expense) => {
    if (!user) return false;
    return user.role === "admin";
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المصاريف</h1>
          <p className="text-muted-foreground">تسجيل وتتبع المصاريف اليومية.</p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="h-4 w-4" />
          إضافة مصروف
        </Button>
      </div>

      {(user?.role === "admin" || user?.role === "manager") && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-lg font-semibold">الفلاتر</h2>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[300px] justify-start text-start font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
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
              <Select
                value={selectedUser}
                onValueChange={(value) =>
                  setSelectedUser(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="تصفية حسب الموظف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الموظفين</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={fetchExpenses} disabled={isFiltering}>
                {isFiltering && <Loader2 className="h-4 w-4 animate-spin" />}
                تطبيق الفلاتر
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {user?.role === "employee" ? "مصاريفك اليوم" : "جميع المصاريف"}
              </CardTitle>
              <CardDescription>
                {user?.role === "employee"
                  ? "قائمة بجميع المصاريف التي سجلتها اليوم."
                  : "قائمة بجميع المصاريف بناءً على الفلاتر المحددة."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-lg font-bold">
              <DollarSign className="h-6 w-6 text-muted-foreground" />
              <span>${totalExpenses.toFixed(2)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المصروف</TableHead>
                {(user?.role === "admin" || user?.role === "manager") && (
                  <TableHead>الموظف</TableHead>
                )}
                <TableHead>التاريخ</TableHead>
                <TableHead className="text-end">المبلغ</TableHead>
                <TableHead className="w-[50px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    لم يتم العثور على مصاريف.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      {expense.name}
                    </TableCell>
                    {(user?.role === "admin" || user?.role === "manager") && (
                      <TableCell>
                        <Badge variant="outline">
                          {expense.users?.name || "غير معروف"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      {format(new Date(expense.created_at), "PPP")}
                    </TableCell>
                    <TableCell className="text-end">
                      ${expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {canEditOrDelete(expense) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">فتح القائمة</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleOpenEditDialog(expense)}
                            >
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingExpense(expense)}
                              className="text-destructive"
                            >
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddOrEditDialogOpen}
        onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}
      >
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={handleCloseDialogs}
        >
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "تحديث تفاصيل هذا المصروف."
                : "املأ تفاصيل المصروف الجديد."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ExpenseForm
              onSubmit={handleFormSubmit}
              onCancel={handleCloseDialogs}
              initialData={editingExpense}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingExpense}
        onOpenChange={() => setDeletingExpense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              هل أنت متأكد أنك تريد حذف هذا المصروف؟
            </AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف المصروف "
              {deletingExpense?.name}" نهائيًا.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialogs}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              className="bg-destructive hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
