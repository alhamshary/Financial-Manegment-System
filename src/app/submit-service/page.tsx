
export const dynamic = 'force-dynamic';

"use client";

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Service = Tables<'services'>;

const formSchema = z.object({
  serviceId: z.string().min(1, { message: "الرجاء تحديد خدمة." }),
  clientName: z.string().min(2, { message: "اسم العميل مطلوب." }),
  clientPhone: z.string().min(10, { message: "رقم هاتف صحيح مطلوب." }),
  quantity: z.coerce.number().min(1, { message: "الكمية يجب أن تكون 1 على الأقل." }),
  discount: z.coerce.number().min(0).optional().default(0),
  notes: z.string().optional(),
  paymentMethod: z.enum(["cash", "wallet"], {
    required_error: "الرجاء تحديد طريقة الدفع.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function SubmitServicePage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [finalPrice, setFinalPrice] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: "",
      clientName: "",
      clientPhone: "",
      quantity: 1,
      discount: 0,
      notes: "",
      paymentMethod: "cash",
    },
  });
  
  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      const { data, error } = await supabase.from('services').select('id, name, price, category, link').order('name');
      if (error) {
        toast({ title: "خطأ في جلب الخدمات", description: error.message, variant: 'destructive' });
      } else {
        setServices(data || []);
      }
      setLoadingServices(false);
    };
    fetchServices();
  }, [toast]);

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id.toString() === serviceId);
    if (service) {
        setSelectedService(service);
        form.setValue("serviceId", serviceId);
        calculatePrice(service.price, form.getValues('quantity'), form.getValues('discount'));
    }
  };

  const calculatePrice = (price: number, quantity: number, discount?: number) => {
    const total = price * quantity;
    const discountedTotal = total - (discount || 0);
    setFinalPrice(Math.max(0, discountedTotal));
  };

  const watchFields = form.watch(["quantity", "discount"]);
  
  useEffect(() => {
    if (selectedService) {
      calculatePrice(selectedService.price, watchFields[0], watchFields[1]);
    }
  }, [selectedService, watchFields]);


  async function onSubmit(values: FormValues) {
    if (!selectedService || !user) {
        toast({ title: "خطأ في الإرسال", description: "يرجى تحديد خدمة والتأكد من تسجيل الدخول.", variant: 'destructive' });
        return;
    }
    
    setSubmitting(true);

    try {
        // Step 1: Find or create the client manually
        let client: Tables<'clients'> | null = null;

        // Try to find an existing client by phone number
        const { data: existingClient, error: findError } = await supabase
            .from('clients')
            .select('*')
            .eq('phone', values.clientPhone)
            .limit(1)
            .single();
        
        // If there's an error and it's not "no rows found", throw it
        if (findError && findError.code !== 'PGRST116') {
            throw findError;
        }
        
        if (existingClient) {
            client = existingClient;
        } else {
            // No client found, so create a new one
            const { data: newClient, error: insertError } = await supabase
                .from('clients')
                .insert({ name: values.clientName, phone: values.clientPhone })
                .select()
                .single();
            
            if (insertError) {
                throw insertError;
            }
            client = newClient;
        }

        if (!client) {
             throw new Error("فشل في إنشاء أو العثور على العميل.");
        }


        // Step 2: Create order
        const orderData = {
            user_id: user.id,
            service_id: selectedService.id,
            client_id: client.id,
            price: selectedService.price,
            quantity: values.quantity,
            discount: values.discount,
            total: finalPrice,
            notes: values.notes || null,
            payment_method: values.paymentMethod,
        };

        const { error: orderError } = await supabase.from('orders').insert([orderData]);

        if (orderError) {
            throw orderError;
        }

        toast({
            title: "تم إرسال الخدمة!",
            description: `تم تسجيل ${selectedService.name} لـ ${values.clientName} بنجاح.`,
        });
        form.reset();
        setSelectedService(null);
        setFinalPrice(0);

    } catch (error: any) {
        toast({
            title: "فشل الإرسال",
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setSubmitting(false);
    }
  }

  return (
    <AppLayout allowedRoles={['admin', 'manager', 'employee']}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إرسال خدمة</h1>
        <p className="text-muted-foreground">
          سجل خدمة قمت بإكمالها لعميل.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>تفاصيل الخدمة</CardTitle>
          <CardDescription>املأ النموذج أدناه.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>الخدمة</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={loadingServices}
                            >
                              {selectedService?.name ?? "اختر خدمة"}
                              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="ابحث عن خدمة..." />
                            <CommandList>
                            {loadingServices ? (
                                <div className="p-4 text-center text-sm">جار التحميل...</div>
                             ) : (
                                <>
                                <CommandEmpty>لم يتم العثور على خدمة.</CommandEmpty>
                                <CommandGroup>
                                {services.map((service) => (
                                    <CommandItem
                                    value={service.name}
                                    key={service.id}
                                    onSelect={() => {
                                        handleServiceSelect(service.id.toString());
                                        form.clearErrors("serviceId");
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "ml-2 h-4 w-4",
                                        service.id.toString() === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                    />
                                    {service.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                                </>
                             )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {selectedService && (
                   <div className="flex flex-col space-y-1.5">
                     <FormLabel>تفاصيل الخدمة</FormLabel>
                      <div className="flex items-center justify-between p-2 border rounded-md h-10">
                        <p className="text-sm text-muted-foreground">
                            السعر الأساسي: ${selectedService.price.toFixed(2)}
                            {selectedService.category && <span className="mx-2">|</span>}
                            {selectedService.category && `الفئة: ${selectedService.category}`}
                        </p>
                        {selectedService.link && (
                            <a href={selectedService.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                                <LinkIcon className="h-4 w-4" />
                                <span>عرض الرابط</span>
                            </a>
                        )}
                     </div>
                   </div>
                )}
                
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم العميل</FormLabel>
                      <FormControl>
                        <Input placeholder="فلان الفلاني" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>هاتف العميل</FormLabel>
                      <FormControl>
                        <Input placeholder="123-456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكمية</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الخصم ($)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>طريقة الدفع</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر طريقة الدفع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">كاش</SelectItem>
                          <SelectItem value="wallet">محفظة</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 <div className="md:col-span-2">
                    <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>ملاحظات (اختياري)</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder="أضف أي ملاحظات حول الخدمة أو العميل هنا..."
                            className="resize-none"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                  <h3 className="text-lg font-semibold">
                    السعر النهائي: <span className="text-primary">${finalPrice.toFixed(2)}</span>
                  </h3>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    إرسال الخدمة
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
