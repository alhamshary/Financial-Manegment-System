
export const dynamic = 'force-dynamic';

"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserForm, type UserFormValues, type UserRole } from "@/components/user-form";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { getInitials } from "@/lib/utils";

type User = Tables<'users'>;

const roleLabels: Record<UserRole, string> = {
  admin: 'مدير',
  manager: 'مشرف',
  employee: 'موظف',
};

export default function TeamPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOrEditDialogOpen, setIsAddOrEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('name', { ascending: true });

    if (error) {
      toast({ title: "خطأ في جلب المستخدمين", description: error.message, variant: 'destructive' });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenAddDialog = () => {
    setEditingUser(null);
    setIsAddOrEditDialogOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setEditingUser(user);
    setIsAddOrEditDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsAddOrEditDialogOpen(false);
    setEditingUser(null);
    setDeletingUser(null);
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    if (editingUser) {
      // Edit logic
      const { error } = await supabase
        .from('users')
        .update({ name: values.name, role: values.role })
        .eq('id', editingUser.id);
      
      if (error) {
        toast({ title: "خطأ في تحديث المستخدم", description: error.message, variant: 'destructive' });
      } else {
        toast({ title: "تم تحديث المستخدم", description: `تم تحديث "${values.name}" بنجاح.` });
        await fetchUsers();
      }
    } else {
      // Add logic - NOTE: This creates a profile but does not handle auth.
      // The created user will not be able to log in without a separate auth setup process.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password!,
        options: {
          data: {
            name: values.name,
            role: values.role
          }
        }
      });

      if (signUpError) {
         toast({ title: "خطأ في إنشاء المستخدم", description: signUpError.message, variant: 'destructive' });
         return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({ id: data.user.id, name: values.name, email: values.email, role: values.role });
        
        if (profileError) {
           toast({ title: "خطأ في إنشاء ملف تعريف المستخدم", description: profileError.message, variant: 'destructive' });
        } else {
            toast({ title: "تمت إضافة المستخدم", description: `تم إرسال دعوة إلى "${values.email}".` });
            await fetchUsers();
        }
      }
    }
    handleCloseDialogs();
  };

  const handleDeleteUser = async () => {
    if (deletingUser) {
      // Note: Supabase admin client is needed for full user deletion (auth + database).
      // This implementation only removes the user profile from the public table.
      // This may fail if there are foreign key constraints.
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', deletingUser.id);

      if (error) {
        toast({ title: "خطأ في حذف المستخدم", description: error.message, variant: 'destructive' });
      } else {
        toast({ title: "تم حذف المستخدم", description: `تمت إزالة "${deletingUser.name}".`, variant: 'destructive' });
        await fetchUsers();
      }
      handleCloseDialogs();
    }
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الفريق</h1>
          <p className="text-muted-foreground">
            إدارة موظفيك وأدوارهم.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle />
          إضافة مستخدم
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>كل المستخدمين</CardTitle>
          <CardDescription>قائمة بجميع المستخدمين في قاعدة بيانات Supabase الخاصة بك.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead className="w-[50px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                 <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    لم يتم العثور على مستخدمين.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://placehold.co/100x100.png`} alt={user.name} data-ai-hint="profile avatar" />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-0.5">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'}>{roleLabels[user.role as UserRole]}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">فتح القائمة</span>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>تعديل الملف الشخصي</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingUser(user)} className="text-destructive">حذف المستخدم</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOrEditDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={handleCloseDialogs}>
          <DialogHeader>
            <DialogTitle>{editingUser ? "تعديل ملف المستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "تحديث اسم المستخدم ودوره." : "إنشاء ملف تعريف مستخدم جديد وإرسال دعوة."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <UserForm 
                onSubmit={handleFormSubmit}
                onCancel={handleCloseDialogs}
                initialData={editingUser}
              />
          </div>
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف ملف تعريف المستخدم "{deletingUser?.name}" نهائيًا. قد يفشل حذف المستخدم إذا كان لديه سجلات مرتبطة مثل الطلبات أو سجلات الحضور.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialogs}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
