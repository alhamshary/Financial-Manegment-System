
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
import type { Tables } from "@/lib/database.types";

type Expense = Tables<'expenses'>;

const formSchema = z.object({
  name: z.string().min(2, { message: "اسم المصروف يجب أن لا يقل عن حرفين." }),
  amount: z.coerce.number().positive({ message: "المبلغ يجب أن يكون رقمًا موجبًا." }),
});

export type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  onSubmit: (values: ExpenseFormValues) => void;
  onCancel: () => void;
  initialData?: Expense | null;
}

export function ExpenseForm({ onSubmit, onCancel, initialData }: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      amount: initialData?.amount ?? 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم المصروف</FormLabel>
              <FormControl>
                <Input placeholder="مثال: أدوات مكتبية" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>المبلغ ($)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>إلغاء</Button>
          <Button type="submit">حفظ</Button>
        </div>
      </form>
    </Form>
  );
}
