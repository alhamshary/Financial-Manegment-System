
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
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { useAuth } from "@/hooks/use-auth";

type Service = Tables<'services'>;

const formSchema = z.object({
  serviceId: z.string().min(1, { message: "Please select a service." }),
  clientName: z.string().min(2, { message: "Client name is required." }),
  clientPhone: z.string().min(10, { message: "Valid phone number is required." }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  discount: z.coerce.number().min(0).optional().default(0),
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
    },
  });
  
  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      const { data, error } = await supabase.from('services').select('*').order('name');
      if (error) {
        toast({ title: "Error fetching services", description: error.message, variant: 'destructive' });
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
        toast({ title: "Submission Error", description: "Please select a service and ensure you are logged in.", variant: 'destructive' });
        return;
    }
    
    setSubmitting(true);

    try {
        // Step 1: Upsert client
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .upsert({ name: values.clientName, phone: values.clientPhone }, { onConflict: 'phone', ignoreDuplicates: false })
            .select()
            .single();

        if (clientError || !clientData) {
            throw clientError || new Error("Failed to create or find client.");
        }

        // Step 2: Create order
        const orderData = {
            user_id: user.id,
            service_id: selectedService.id,
            client_id: clientData.id,
            price: selectedService.price,
            quantity: values.quantity,
            discount: values.discount,
            total: finalPrice,
        };

        const { error: orderError } = await supabase.from('orders').insert(orderData);

        if (orderError) {
            throw orderError;
        }

        toast({
            title: "Service Submitted!",
            description: `${selectedService.name} for ${values.clientName} has been logged successfully.`,
        });
        form.reset();
        setSelectedService(null);
        setFinalPrice(0);

    } catch (error: any) {
        toast({
            title: "Submission Failed",
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
        <h1 className="text-3xl font-bold tracking-tight">Submit a Service</h1>
        <p className="text-muted-foreground">
          Log a service that you have completed for a client.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>Fill out the form below.</CardDescription>
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
                      <FormLabel>Service</FormLabel>
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
                              {selectedService?.name ?? "Select service"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search service..." />
                            <CommandList>
                            {loadingServices ? (
                                <div className="p-4 text-center text-sm">Loading...</div>
                             ) : (
                                <>
                                <CommandEmpty>No service found.</CommandEmpty>
                                <CommandGroup>
                                {services.map((service) => (
                                    <CommandItem
                                    value={service.id.toString()}
                                    key={service.id}
                                    onSelect={(currentValue) => {
                                        handleServiceSelect(currentValue);
                                        form.clearErrors("serviceId");
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
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
                     <FormLabel>Price Details</FormLabel>
                     <div className="flex items-center p-2 border rounded-md h-10">
                       <p className="text-sm text-muted-foreground">
                         Base Price: ${selectedService.price.toFixed(2)}
                         {selectedService.category && <span className="mx-2">|</span>}
                         {selectedService.category && `Category: ${selectedService.category}`}
                       </p>
                     </div>
                   </div>
                )}
                
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                      <FormLabel>Client Phone</FormLabel>
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
                      <FormLabel>Quantity</FormLabel>
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
                      <FormLabel>Discount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                  <h3 className="text-lg font-semibold">
                    Final Price: <span className="text-primary">${finalPrice.toFixed(2)}</span>
                  </h3>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Service
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
