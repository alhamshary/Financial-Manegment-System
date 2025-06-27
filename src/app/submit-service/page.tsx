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
import { services, type Service } from "@/lib/data";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  serviceId: z.string().min(1, { message: "Please select a service." }),
  clientName: z.string().min(2, { message: "Client name is required." }),
  clientPhone: z.string().min(10, { message: "Valid phone number is required." }),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  discount: z.coerce.number().min(0).optional(),
});

export default function SubmitServicePage() {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [finalPrice, setFinalPrice] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: "",
      clientName: "",
      clientPhone: "",
      quantity: 1,
      discount: 0,
    },
  });

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    form.setValue("serviceId", service.id);
    calculatePrice(service.price, form.getValues('quantity'), form.getValues('discount'));
  };

  const calculatePrice = (price: number, quantity: number, discount?: number) => {
    const total = price * quantity;
    const discountedTotal = total - (discount || 0);
    setFinalPrice(Math.max(0, discountedTotal));
  };

  const watchFields = form.watch(["quantity", "discount"]);
  
  useState(() => {
    if (selectedService) {
      calculatePrice(selectedService.price, watchFields[0], watchFields[1]);
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log({ ...values, finalPrice });
    toast({
      title: "Service Submitted!",
      description: `${selectedService?.name} for ${values.clientName} has been logged.`,
    });
    form.reset();
    setSelectedService(null);
    setFinalPrice(0);
  }

  return (
    <AppLayout allowedRoles={['employee']}>
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
                            <CommandEmpty>No service found.</CommandEmpty>
                            <CommandGroup>
                              {services.map((service) => (
                                <CommandItem
                                  value={service.name}
                                  key={service.id}
                                  onSelect={() => handleServiceSelect(service)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      service.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {service.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
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
                     <div className="flex items-baseline p-2 border rounded-md">
                       <p className="text-sm text-muted-foreground">
                         Base Price: ${selectedService.price.toFixed(2)}
                         <span className="mx-2">|</span>
                         Category: {selectedService.category}
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
                  <Button type="submit">Submit Service</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
