"use client";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and we have a user, redirect to the dashboard.
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // While AuthProvider is loading OR if a user is logged in (and we are about to redirect),
  // show a loading spinner. This prevents the login form from flashing.
  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Only show the login form if we are not loading and there is no logged-in user.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          مرحباً بكم في نظام المحاسبة للهمشري
        </h1>
        <p className="text-muted-foreground">الحل المتكامل لإدارة خدماتك.</p>
      </div>
      <LoginForm />
    </main>
  );
}
