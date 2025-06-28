
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

interface AppLayoutProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function AppLayout({ children, allowedRoles }: AppLayoutProps) {
  const { user, loading, settings } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, loading, router, allowedRoles]);

  if (loading || !user || (allowedRoles && !allowedRoles.includes(user.role)) || !settings) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
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
