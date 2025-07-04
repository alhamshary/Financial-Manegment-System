"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { applyTheme } from "@/components/theme-provider";
import type { Tables } from "@/lib/database.types";

export type UserRole = "admin" | "manager" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type AppSettings = Tables<"app_settings">;

export interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  settings: AppSettings | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const logout = useCallback(async () => {
    if (user?.id) {
      try {
        // End attendance session in the background. Don't let it block logout.
        await supabase.rpc("end_current_attendance", {
          user_id_param: user.id,
        });
      } catch (error) {
        // Log the error but don't block the user's logout flow.
        console.error(
          "Background task: Failed to end attendance session on logout:",
          error
        );
      }
    }
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  }, [router, user?.id]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      const currentUser = session?.user;
      if (currentUser) {
        try {
          // Fetch critical data first
          const [profileResult, settingsResult] = await Promise.all([
            supabase
              .from("users")
              .select("name, role")
              .eq("id", currentUser.id)
              .single(),
            supabase.from("app_settings").select("*").eq("id", true).single(),
          ]);

          const { data: profile, error: profileError } = profileResult;
          if (profileError) throw profileError;

          const { data: appSettings, error: settingsError } = settingsResult;
          if (settingsError) throw settingsError;

          setUser({
            id: currentUser.id,
            email: currentUser.email!,
            name: profile.name || currentUser.email!,
            role: (profile.role as UserRole) || "employee",
          });

          const currentSettings = (appSettings as AppSettings) || {
            id: true,
            office_title: "المكتب الرئيسي",
            app_theme: "theme-default",
          };
          setSettings(currentSettings);
          applyTheme(currentSettings.app_theme);

          // --- Non-blocking background tasks ---
          // This runs in the background. If it fails, it shows a toast but does NOT block login.
          (async () => {
            try {
              const { error: attendanceError } = await supabase.rpc(
                "auto_start_attendance",
                { user_id_param: currentUser.id }
              );
              if (attendanceError)
                throw new Error(`Attendance Error: ${attendanceError.message}`);
            } catch (err: any) {
              toast({
                title: "خطأ في بدء الجلسة",
                description: err.message,
                variant: "destructive",
              });
            }
          })();
        } catch (error: any) {
          // This catch block now only handles critical data loading errors
          toast({
            title: "خطأ في تحميل البيانات",
            description: error.message,
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setUser(null);
          setSettings(null);
        }
      } else {
        setUser(null);
        setSettings(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      console.error("Login error:", error.message);
      return false;
    }
    // onAuthStateChange will handle setting user state and redirecting
    return true;
  };

  const value = useMemo(
    () => ({ user, login, logout, loading, settings }),
    [user, login, logout, loading, settings]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
