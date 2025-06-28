
"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { applyTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { settings: globalSettings } = useAuth();

  const [officeTitle, setOfficeTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (globalSettings) {
      setOfficeTitle(globalSettings.office_title);
      setTheme(globalSettings.app_theme);
      setIsLoading(false);
    }
  }, [globalSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .update({ office_title: officeTitle, app_theme: theme })
      .eq('id', true);

    if (error) {
      toast({
        title: "خطأ في حفظ الإعدادات",
        description: error.message,
        variant: "destructive",
      });
    } else {
      applyTheme(theme); // Apply theme immediately for visual feedback
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم حفظ تغييراتك بنجاح.",
      });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <AppLayout allowedRoles={['admin']}>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout allowedRoles={['admin']}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground">
          إدارة إعدادات التطبيق الخاص بك.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>الإعدادات العامة</CardTitle>
          <CardDescription>ضبط الإعدادات العامة للتطبيق.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="office-title">عنوان المكتب</Label>
            <Input
              id="office-title"
              value={officeTitle}
              onChange={(e) => setOfficeTitle(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              سيتم عرض هذا في الترويسة.
            </p>
          </div>
          <div className="space-y-2">
            <Label>سمة اللون</Label>
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div>
                <RadioGroupItem value="theme-default" id="theme-default" className="peer sr-only" />
                <Label
                  htmlFor="theme-default"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                   <span style={{'--bg': '#2F6690', '--accent': '#81C3D7'}} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--bg)'}}></span>
                      <span className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--accent)'}}></span>
                   </span>
                  افتراضي
                </Label>
              </div>
               <div>
                <RadioGroupItem value="theme-rose" id="theme-rose" className="peer sr-only" />
                <Label
                  htmlFor="theme-rose"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                   <span style={{'--bg': '#E11D48', '--accent': '#F472B6'}} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--bg)'}}></span>
                      <span className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--accent)'}}></span>
                   </span>
                  وردي
                </Label>
              </div>
              <div>
                <RadioGroupItem value="theme-green" id="theme-green" className="peer sr-only" />
                <Label
                  htmlFor="theme-green"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                   <span style={{'--bg': '#16A34A', '--accent': '#4ADE80'}} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--bg)'}}></span>
                      <span className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--accent)'}}></span>
                   </span>
                  أخضر
                </Label>
              </div>
               <div>
                <RadioGroupItem value="theme-orange" id="theme-orange" className="peer sr-only" />
                <Label
                  htmlFor="theme-orange"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                   <span style={{'--bg': '#F97316', '--accent': '#FB923C'}} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--bg)'}}></span>
                      <span className="w-6 h-6 rounded-full" style={{backgroundColor: 'var(--accent)'}}></span>
                   </span>
                  برتقالي
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ التغييرات
          </Button>
        </CardFooter>
      </Card>
    </AppLayout>
  );
}
