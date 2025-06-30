
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const handleAuthStateChange = useCallback(async (event: string, session: any) => {
    try {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user) {
          const [profileRes, settingsRes] = await Promise.all([
            supabase.from('users').select('id, name, role').eq('id', session.user.id).single(),
            supabase.from('app_settings').select('*').eq('id', true).single(),
          ]);

          if (profileRes.error) throw profileRes.error;
          if (settingsRes.error && settingsRes.error.code !== 'PGRST116') throw settingsRes.error;
          
          const profile = profileRes.data;
          const loadedUser: User = {
            id: profile.id,
            email: session.user.email!,
            name: profile.name,
            role: profile.role as UserRole,
          };
          
          const finalSettings = settingsRes.data || {
            id: true,
            office_title: 'المكتب الرئيسي',
            app_theme: 'theme-green',
          };

          setUser(loadedUser);
          setSettings(finalSettings);
          applyTheme(finalSettings.app_theme);
          
          if (event === 'SIGNED_IN') {
            await supabase.rpc('auto_start_attendance', { user_id_param: session.user.id });
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSessionStartTime(null);
      }
    } catch (error: any) {
      toast({ title: 'خطأ في المصادقة', description: error.message, variant: 'destructive' });
      setUser(null);
    } finally {
        if(initialLoad) {
            setLoading(false);
            setInitialLoad(false);
        }
    }
  }, [toast, initialLoad]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthStateChange(event, session);
    });

    // Handle initial settings load for non-logged-in users
    const fetchSettings = async () => {
        const { data: { session }} = await supabase.auth.getSession();
        if(!session) {
            try {
                const {data: settingsData} = await supabase.from('app_settings').select('*').eq('id', true).single();
                const finalSettings = settingsData || {
                    id: true,
                    office_title: 'المكتب الرئيسي',
                    app_theme: 'theme-green',
                };
                setSettings(finalSettings);
                applyTheme(finalSettings.app_theme);
            } catch (e) {
                // ignore
            } finally {
                setLoading(false);
                setInitialLoad(false);
            }
        }
    }
    fetchSettings();


    return () => {
      subscription.unsubscribe();
    };
  }, [handleAuthStateChange]);


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
      if (data) setSessionStartTime(data.check_in);
      setIsSessionLoading(false);
  }, []);
  
  useEffect(() => {
    if (user?.id) {
        fetchActiveSession(user.id)
    } else {
      setSessionStartTime(null);
      setIsSessionLoading(false);
    }
  }, [user?.id, fetchActiveSession]);

  useEffect(() => {
    if (!sessionStartTime) {
      setSessionDuration('00:00:00');
      return;
    }
    const timer = setInterval(() => {
      const start = new Date(sessionStartTime).getTime();
      const now = new Date().getTime();
      const difference = now - start;
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setSessionDuration(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error('Login error:', error.message);
      return false;
    }
    return true;
  };

  const logout = async () => {
    if (user) {
        try {
             // We need to find the currently active session for this user to end it
            const todayIso = new Date().toISOString().split('T')[0];
            const { data: activeSession, error: sessionError } = await supabase
              .from('attendance')
              .select('id')
              .eq('user_id', user.id)
              .eq('work_date', todayIso)
              .is('check_out', null)
              .limit(1)
              .single();

            if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;

            if (activeSession) {
               await supabase.rpc('end_current_attendance', { user_id_param: user.id });
            }
        } catch (error: any) {
             toast({ title: 'خطأ في إنهاء الجلسة', description: `لم نتمكن من إيقاف الجلسة بشكل صحيح: ${error.message}`, variant: 'destructive'});
        }
    }
    await supabase.auth.signOut();
  };

  const authValue = { user, loading, settings, login, logout };
  const timerValue = { sessionDuration, isSessionLoading };

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
