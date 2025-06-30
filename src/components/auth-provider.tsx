
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
  const [loading, setLoading] = useState(true); // Global loading gate for auth status

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [activeSessionStartTime, setActiveSessionStartTime] = useState<string | null>(null);

  // Effect 1: Handle Authentication State
  // This is the single source of truth for the user's auth status.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          toast({ title: 'خطأ في جلب الملف الشخصي', description: error.message, variant: 'destructive' });
          setUser(null);
        } else {
          setUser({
            id: profile.id,
            email: session.user.email!,
            name: profile.name,
            role: profile.role as UserRole,
          });
        }
      } else {
        setUser(null);
      }
      // Critical: Set loading to false only after the auth state has been fully determined.
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  // Effect 2: Fetch App Settings
  // This runs independently and ensures the theme is always applied.
  useEffect(() => {
    const fetchAppSettings = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        toast({ title: "خطأ في جلب الإعدادات", description: error.message, variant: "destructive" });
      } else {
        const loadedSettings = data || { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-green' };
        setSettings(loadedSettings);
        applyTheme(loadedSettings.app_theme);
      }
    };
    
    fetchAppSettings();
  }, [toast]);

  // Effect 3: Handle Redirection
  // This is now guarded by a stable `loading` state.
  useEffect(() => {
    if (loading) return;
    
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
    await supabase.auth.signOut();
    // Force redirect to login page after sign out to ensure clean state
    router.push('/');
  };

  const authValue = useMemo(() => ({ user, loading, settings, login, logout }), [user, loading, settings]);
  const timerValue = useMemo(() => ({ sessionDuration, isSessionLoading }), [sessionDuration, isSessionLoading]);

  // The global loading gate. This shows a spinner until auth status is known.
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
