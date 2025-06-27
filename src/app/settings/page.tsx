"use client";

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been successfully saved.",
    });
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Adjust general settings for the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="office-title">Office Title</Label>
            <Input id="office-title" defaultValue="Main Office" />
            <p className="text-sm text-muted-foreground">
              This will be displayed in the header.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Color Theme</Label>
            <RadioGroup defaultValue="theme-default" className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  Default
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
                  Rose
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
                  Green
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
                  Orange
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </CardFooter>
      </Card>
    </AppLayout>
  );
}
