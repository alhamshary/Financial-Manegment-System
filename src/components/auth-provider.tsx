"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { applyTheme } from '@/components/theme-provider';
import type { Tables } from '@/lib/database.types';

export type UserRole = 'admin' | 'manager' | 'employee';
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
export type AppSettings = Tables<'app_settings'>;
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  settings: AppSettings | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until first auth check is complete

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        try {
          const { data: appSettings, error: settingsError } = await supabase
            .from('app_settings')
            .select('*')
            .eq('id', true)
            .single();

          if (settingsError && settingsError.code !== 'PGRST116') {
            throw settingsError;
          }
          const loadedSettings = appSettings || { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' };
          setSettings(loadedSettings);
          applyTheme(loadedSettings.app_theme);

          if (session?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('id, name, role')
              .eq('id', session.user.id)
              .single();

            if (profileError) throw profileError;

            setUser({
              id: profile.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role as UserRole,
            });
          } else {
            setUser(null);
          }
        } catch (error: any) {
          toast({
            title: "خطأ في تحميل الجلسة",
            description: error.message,
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/';
    if (user && isAuthPage) {
      router.replace('/dashboard');
    } else if (!user && !isAuthPage) {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error('Login error:', error.message);
      return false;
    }
    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.replace('/');
  }, [router]);

  const authValue = useMemo(() => ({ user, loading, settings, login, logout }), [user, loading, settings, login, logout]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}
