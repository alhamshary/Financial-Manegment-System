
"use client";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  console.log("user HOM",user)
  useEffect(() => {
    if ( user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if(loading ) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          مرحباً بكم في نظام المحاسبة للهمشري
        </h1>
        <p className="text-muted-foreground">
          الحل المتكامل لإدارة خدماتك.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
