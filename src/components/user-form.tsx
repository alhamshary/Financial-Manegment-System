
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/lib/database.types";

type User = Tables<'users'>;
export type UserRole = User['role'];

const roles: UserRole[] = ['admin', 'manager', 'employee'];

const roleLabels: Record<UserRole, string> = {
  admin: 'مدير',
  manager: 'مشرف',
  employee: 'موظف',
};


// Base schema for editing
const baseSchema = z.object({
  name: z.string().min(2, { message: "الاسم يجب أن لا يقل عن حرفين." }),
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صحيح." }),
  role: z.enum(roles, { required_error: "الرجاء تحديد دور." }),
});

// Conditional schema for adding a new user (password is required)
const formSchema = z.discriminatedUnion("isEditing", [
  baseSchema.extend({
    isEditing: z.literal(true),
    password: z.string().optional(),
  }),
  baseSchema.extend({
    isEditing: z.literal(false),
    password: z.string().min(6, { message: "كلمة المرور يجب أن لا تقل عن 6 أحرف." }),
  }),
]);


export type UserFormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
  initialData?: User | null;
}

export function UserForm({ onSubmit, onCancel, initialData }: UserFormProps) {
  const isEditing = !!initialData;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing
      ? { isEditing, name: initialData.name, email: initialData.email, role: initialData.role as UserRole }
      : { isEditing, name: "", email: "", role: "employee", password: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الاسم الكامل</FormLabel>
              <FormControl>
                <Input placeholder="فلان الفلاني" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>البريد الإلكتروني</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} disabled={isEditing} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEditing && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>كلمة المرور</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الدور</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر دورًا" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role} className="text-end">
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button>
          <Button type="submit">{isEditing ? "حفظ التغييرات" : "إنشاء مستخدم"}</Button>
        </div>
      </form>
    </Form>
  );
}
