"use client"
import type { ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AppLayoutProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function AppLayout({ children, allowedRoles }: AppLayoutProps) {
  const { user, loading, settings } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, loading, router, allowedRoles]);

  useEffect(() => {
    // This side-effect runs once when the user is confirmed to be logged in.
    // It's separated from the main auth flow to prevent blocking login.
    const startAttendance = async () => {
      if (user?.id) {
        try {
          await supabase.rpc('auto_start_attendance', { user_id_param: user.id });
        } catch (rpcError: any) {
          console.error("Failed to start attendance session:", rpcError);
          // This is a non-critical error, so we just log it and maybe show a toast.
          // It should not prevent the app from working.
          toast({ title: 'خطأ في بدء الحضور', description: 'لم نتمكن من بدء جلسة الحضور تلقائيًا.', variant: 'destructive' });
        }
      }
    };
    
    startAttendance();
  }, [user?.id, toast]);

  if (loading || !user || !settings) {
    return null; 
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar side="right">
        <SidebarHeader className="p-4">
          <h1 className="text-2xl font-bold text-sidebar-foreground">الهمشري</h1>
        </SidebarHeader>
        <SidebarContent>
          <MainNav role={user.role} />
        </SidebarContent>
        <SidebarFooter>
          {/* Footer content if any */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6">
          <SidebarTrigger />
          <h2 className="text-xl font-semibold">{settings.office_title}</h2>
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
