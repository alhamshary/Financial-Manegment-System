
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
type UserRole = User['role'];

const roles: UserRole[] = ['admin', 'manager', 'employee'];

// Base schema for editing
const baseSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  role: z.enum(roles, { required_error: "Please select a role." }),
});

// Conditional schema for adding a new user (password is required)
const formSchema = z.discriminatedUnion("isEditing", [
  baseSchema.extend({
    isEditing: z.literal(true),
    password: z.string().optional(),
  }),
  baseSchema.extend({
    isEditing: z.literal(false),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
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
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
              <FormLabel>Email</FormLabel>
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
                <FormLabel>Password</FormLabel>
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
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{isEditing ? "Save Changes" : "Create User"}</Button>
        </div>
      </form>
    </Form>
  );
}

