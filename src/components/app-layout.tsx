
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
import { useEffect, useState } from "react";

interface AppLayoutProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function AppLayout({ children, allowedRoles }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [officeTitle, setOfficeTitle] = useState("عنوان المكتب");
  
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, loading, router, allowedRoles]);

  useEffect(() => {
    const savedTitle = localStorage.getItem('officeTitle');
    if (savedTitle) {
      setOfficeTitle(savedTitle);
    } else {
        setOfficeTitle("عنوان المكتب");
    }

    const handleStorageChange = () => {
      const updatedTitle = localStorage.getItem('officeTitle');
      setOfficeTitle(updatedTitle || "عنوان المكتب");
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (loading || !user || (allowedRoles && !allowedRoles.includes(user.role))) {
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
          <UserNav />
          <h2 className="text-xl font-semibold">{officeTitle}</h2>
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
