
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

type Service = Tables<'services'>;

const formSchema = z.object({
  name: z.string().min(2, { message: "اسم الخدمة يجب أن لا يقل عن حرفين." }),
  category: z.string().optional(),
  price: z.coerce.number().min(0, { message: "السعر يجب أن يكون رقمًا موجبًا." }),
  link: z.string().url({ message: "الرجاء إدخال رابط صحيح." }).optional().or(z.literal('')),
});

type ServiceFormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
  onSubmit: (values: ServiceFormValues) => void;
  onCancel: () => void;
  initialData?: Service | null;
}

export function ServiceForm({ onSubmit, onCancel, initialData }: ServiceFormProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      category: initialData?.category ?? "",
      price: initialData?.price ?? 0,
      link: initialData?.link ?? "",
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
              <FormLabel>اسم الخدمة</FormLabel>
              <FormControl>
                <Input placeholder="مثال: قص شعر" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الفئة (اختياري)</FormLabel>
              <FormControl>
                <Input placeholder="مثال: تصفيف" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>السعر ($)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>رابط الموقع (اختياري)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
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
