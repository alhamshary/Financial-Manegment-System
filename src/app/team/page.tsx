
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
import { UserForm, type UserFormValues } from "@/components/user-form";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type User = Tables<'users'>;

export default function TeamPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOrEditDialogOpen, setIsAddOrEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({ title: "Error fetching users", description: error.message, variant: 'destructive' });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
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
        toast({ title: "Error updating user", description: error.message, variant: 'destructive' });
      } else {
        toast({ title: "User Updated", description: `"${values.name}" has been successfully updated.` });
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
         toast({ title: "Error creating user", description: signUpError.message, variant: 'destructive' });
         return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({ id: data.user.id, name: values.name, email: values.email, role: values.role });
        
        if (profileError) {
           toast({ title: "Error creating user profile", description: profileError.message, variant: 'destructive' });
        } else {
            toast({ title: "User Added", description: `An invitation has been sent to "${values.email}".` });
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
        toast({ title: "Error deleting user", description: error.message, variant: 'destructive' });
      } else {
        toast({ title: "User Deleted", description: `"${deletingUser.name}" has been removed.`, variant: 'destructive' });
        await fetchUsers();
      }
      handleCloseDialogs();
    }
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your employees and their roles.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A list of all users in your Supabase database.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
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
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://placehold.co/100x100.png`} data-ai-hint="profile avatar" />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-0.5">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>Edit Profile</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingUser(user)} className="text-destructive">Delete User</DropdownMenuItem>
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
            <DialogTitle>{editingUser ? "Edit User Profile" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update the user's name and role." : "Create a new user profile and send an invitation."}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user profile for "{deletingUser?.name}". Deleting the user may fail if they have associated records like orders or attendance logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
