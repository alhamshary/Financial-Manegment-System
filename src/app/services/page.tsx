
"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Link as LinkIcon, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { ServiceForm } from "@/components/service-form";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type Service = Tables<'services'>;
type ServiceFormValues = Omit<TablesInsert<'services'>, 'created_at' | 'id'>;


export default function ServicesPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOrEditDialogOpen, setIsAddOrEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({ title: "خطأ في جلب الخدمات", description: error.message, variant: 'destructive' });
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingService(null);
    setIsAddOrEditDialogOpen(true);
  };

  const handleOpenEditDialog = (service: Service) => {
    setEditingService(service);
    setIsAddOrEditDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsAddOrEditDialogOpen(false);
    setEditingService(null);
    setDeletingService(null);
  };
  
  const handleFormSubmit = async (values: ServiceFormValues) => {
    const serviceData = {
      ...values,
      category: values.category || null,
      link: values.link || null,
    }

    if (editingService) {
      // Edit logic
      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id);
      
      if (error) {
        toast({ title: "خطأ في تحديث الخدمة", description: error.message, variant: 'destructive' });
      } else {
        toast({ title: "تم تحديث الخدمة", description: `تم تحديث "${values.name}" بنجاح.` });
        await fetchServices();
      }
    } else {
      // Add logic
      const { error } = await supabase
        .from('services')
        .insert(serviceData as TablesInsert<'services'>);
      
      if (error) {
        toast({ title: "خطأ في إضافة الخدمة", description: error.message, variant: 'destructive' });
      } else {
        toast({ title: "تمت إضافة الخدمة", description: `تمت إضافة "${values.name}" بنجاح.` });
        await fetchServices();
      }
    }
    handleCloseDialogs();
  };

  const handleDeleteService = async () => {
    if (deletingService) {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', deletingService.id);

      if (error) {
        toast({ title: "خطأ في حذف الخدمة", description: error.message, variant: 'destructive' });
      } else {
        toast({ title: "تم حذف الخدمة", description: `تم حذف "${deletingService.name}" بنجاح.`, variant: 'destructive' });
        await fetchServices();
      }
      handleCloseDialogs();
    }
  };

  return (
    <AppLayout allowedRoles={['admin', 'manager']}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الخدمات</h1>
          <p className="text-muted-foreground">
            إضافة أو تعديل أو حذف الخدمات المقدمة.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة خدمة
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>جميع الخدمات</CardTitle>
          <CardDescription>قائمة بجميع الخدمات المتاحة من قاعدة البيانات.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الخدمة</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>الرابط</TableHead>
                <TableHead className="text-end">السعر</TableHead>
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
              ) : services.length === 0 ? (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    لم يتم العثور على خدمات.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      {service.category && <Badge variant="outline">{service.category}</Badge>}
                    </TableCell>
                    <TableCell>
                      {service.link && (
                        <a href={service.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <LinkIcon className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-end">${service.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">فتح القائمة</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(service)}>تعديل</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingService(service)} className="text-destructive">حذف</DropdownMenuItem>
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
            <DialogTitle>{editingService ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</DialogTitle>
            <DialogDescription>
              {editingService ? "تحديث تفاصيل هذه الخدمة." : "املأ تفاصيل الخدمة الجديدة."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <ServiceForm 
                onSubmit={handleFormSubmit}
                onCancel={handleCloseDialogs}
                initialData={editingService}
              />
          </div>
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingService} onOpenChange={() => setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد أنك تريد حذف هذه الخدمة؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف الخدمة "{deletingService?.name}" نهائيًا. قد يفشل هذا الإجراء إذا تم استخدام الخدمة في أي طلبات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialogs}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
