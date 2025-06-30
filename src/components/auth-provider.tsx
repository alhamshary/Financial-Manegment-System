
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { applyTheme } from '@/components/theme-provider';
import type { Tables } from '@/lib/database.types';

// Types
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
  logout: () => void;
}

// Context
export const AuthContext = createContext<AuthContextType | null>(null);

// Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);

        try {
          if (session?.user) {
            const [profileResult, settingsResult] = await Promise.all([
              supabase
                .from('users')
                .select('id, name, role')
                .eq('id', session.user.id)
                .single(),
              supabase
                .from('app_settings')
                .select('*')
                .eq('id', true)
                .single()
            ]);

            const { data: profile, error: profileError } = profileResult;
            if (profileError) throw profileError;

            const { data: appSettings, error: settingsError } = settingsResult;
            if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

            setUser({
              id: profile.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role as UserRole,
            });

            const loadedSettings = appSettings || { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' };
            setSettings(loadedSettings);
            applyTheme(loadedSettings.app_theme);
            
            await supabase.rpc('auto_start_attendance', { user_id_param: session.user.id });

          } else {
            setUser(null);
            
            const { data: appSettings, error: settingsError } = await supabase.from('app_settings').select('*').eq('id', true).single();
            if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

            const loadedSettings = appSettings || { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' };
            setSettings(loadedSettings);
            applyTheme(loadedSettings.app_theme);
          }
        } catch (error: any) {
          toast({ title: 'خطأ في تحميل البيانات', description: error.message, variant: 'destructive' });
          await supabase.auth.signOut();
          setUser(null);
          setSettings(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (user) {
      try {
        await supabase.rpc('end_current_attendance', { user_id_param: user.id });
      } catch (error: any) {
        toast({ title: 'خطأ في إنهاء الجلسة', description: `لم نتمكن من إيقاف الجلسة بشكل صحيح: ${error.message}`, variant: 'destructive' });
      }
    }
    await supabase.auth.signOut();
  }, [user, toast]);

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
