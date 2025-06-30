
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
  logout: () => void;
}

export interface TimerContextType {
  sessionDuration: string;
  isSessionLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);
export const TimerContext = createContext<TimerContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true); // Only for the initial page load.

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [activeSessionStartTime, setActiveSessionStartTime] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs once on mount to set up the auth listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        let loadedUser: User | null = null;
        let loadedSettings: AppSettings | null = null;

        try {
          // Both fetches run in parallel for efficiency.
          const [settingsRes, profileRes] = await Promise.all([
            supabase.from('app_settings').select('*').eq('id', true).single(),
            session?.user ? supabase.from('users').select('id, name, role').eq('id', session.user.id).single() : Promise.resolve(null)
          ]);
          
          if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
            throw settingsRes.error;
          }
           loadedSettings = settingsRes.data || {
            id: true,
            office_title: 'المكتب الرئيسي',
            app_theme: 'theme-green',
          };
          
          if (session?.user && profileRes) {
            if (profileRes.error) throw profileRes.error;
            const profile = profileRes.data;
            loadedUser = {
              id: profile.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role as UserRole,
            };
          }

        } catch (error: any) {
          console.error("Auth error:", error);
          toast({ title: 'خطأ في المصادقة', description: error.message, variant: 'destructive' });
          loadedUser = null; // Ensure user is null on error
        } finally {
          // Update state with the results.
          setUser(loadedUser);
          if (loadedSettings) {
            setSettings(loadedSettings);
            applyTheme(loadedSettings.app_theme);
          }
          // The first time this callback runs, the initial load is complete.
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  useEffect(() => {
    // Redirection logic. This runs whenever loading or user changes.
    if (loading) return; // Don't do anything while loading.

    const isAuthPage = pathname === '/';

    if (user && isAuthPage) {
      router.replace('/dashboard');
    } else if (!user && !isAuthPage) {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  const fetchActiveSession = useCallback(async (userId: string) => {
      setIsSessionLoading(true);
      const todayIso = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance')
        .select('check_in')
        .eq('user_id', userId)
        .eq('work_date', todayIso)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1)
        .single();
      
      setActiveSessionStartTime(data?.check_in || null);
      setIsSessionLoading(false);
  }, []);
  
  useEffect(() => {
    if (user?.id) {
        fetchActiveSession(user.id);
    } else {
      setActiveSessionStartTime(null);
      setIsSessionLoading(false);
    }
  }, [user?.id, fetchActiveSession]);

  useEffect(() => {
    if (!activeSessionStartTime) {
      setSessionDuration('00:00:00');
      return;
    }
    const timer = setInterval(() => {
      const start = new Date(activeSessionStartTime).getTime();
      const now = new Date().getTime();
      const difference = now - start;
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setSessionDuration(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSessionStartTime]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error('Login error:', error.message);
      return false;
    }
    // onAuthStateChange will fire, updating user state and triggering redirect.
    return true;
  };

  const logout = async () => {
    if (user) {
        try {
            await supabase.rpc('end_current_attendance', { user_id_param: user.id });
        } catch (error: any) {
             toast({ title: 'خطأ في إنهاء الجلسة', description: `لم نتمكن من إيقاف الجلسة بشكل صحيح: ${error.message}`, variant: 'destructive'});
        }
    }
    // onAuthStateChange will fire, setting user to null and triggering redirect.
    await supabase.auth.signOut();
  };

  const authValue = useMemo(() => ({ user, loading, settings, login, logout }), [user, loading, settings]);
  const timerValue = useMemo(() => ({ sessionDuration, isSessionLoading }), [sessionDuration, isSessionLoading]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <TimerContext.Provider value={timerValue}>
        {children}
      </TimerContext.Provider>
    </AuthContext.Provider>
  );
}
