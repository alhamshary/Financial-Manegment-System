
"use client";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  // All loading and redirection logic is now centralized in AuthProvider.
  // This component's only responsibility is to display the login form.
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
