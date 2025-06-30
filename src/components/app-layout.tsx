
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
    // This logic is now handled by the central AuthProvider
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, loading, router, allowedRoles]);

  // The global loading spinner is now inside AuthProvider,
  // so we don't need to render it here anymore.
  if (loading || !user || !settings) {
    return null; // AuthProvider is handling the loading state
  }

  // Also check role access after loading is complete
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirecting is handled in the useEffect above, but as a fallback,
    // we can return null to prevent rendering unauthorized content.
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
