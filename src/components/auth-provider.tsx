
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useContext, useCallback } from 'react';
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

export const AuthContext = createContext<AuthContextType | null>(null);

export interface TimerContextType {
  sessionDuration: string;
  isSessionLoading: boolean;
}

export const TimerContext = createContext<TimerContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  const fetchSettings = useCallback(async () => {
    try {
      const { data: appSettings, error: settingsError } = await supabase
        .from('app_settings')
        .select('office_title, app_theme')
        .eq('id', true)
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      const finalSettings = appSettings || { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' };
      setSettings(finalSettings);
      if (finalSettings.app_theme) {
        applyTheme(finalSettings.app_theme);
      }
      return finalSettings;
    } catch (error) {
      console.error("Error fetching app settings:", error);
      const defaultSettings = { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' };
      setSettings(defaultSettings);
      applyTheme(defaultSettings.app_theme);
      return defaultSettings;
    }
  }, []);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);

      const settingsPromise = fetchSettings();
      let userPromise: Promise<any>;

      if (session?.user) {
        userPromise = supabase
          .from('users')
          .select('name, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
              if (profile) {
                const loadedUser = {
                  id: session.user.id,
                  email: session.user.email!,
                  name: profile.name || session.user.email!,
                  role: (profile.role as UserRole) || 'employee',
                };
                setUser(loadedUser);
                return loadedUser;
              }
              setUser(null);
              return null;
          });
      } else {
        userPromise = Promise.resolve(null);
        setUser(null);
      }
      
      const [loadedUser] = await Promise.all([userPromise, settingsPromise]);

      if (loadedUser) {
        if (pathname === '/') {
          router.replace('/dashboard');
        }
      } else {
        if (pathname !== '/') {
          router.replace('/');
        }
      }
      
      setLoading(false);

      if (_event === 'SIGNED_IN' && session?.user) {
        try {
          if (typeof window !== 'undefined') {
            await supabase.rpc('auto_start_attendance', { user_id_param: session.user.id });
          }
        } catch (error: any) {
          toast({ title: 'خطأ في بدء الجلسة', description: `لم نتمكن من تسجيل جلسة الحضور أو الدخول بشكل صحيح: ${error.message}`, variant: 'destructive'});
        }
      }

      if (_event === 'SIGNED_OUT') {
        setUser(null);
        setSessionStartTime(null);
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname, fetchSettings, toast]);

  useEffect(() => {
    if (!user?.id) { 
        setSessionStartTime(null); 
        return; 
    }
    const fetchActiveSession = async () => {
        setIsSessionLoading(true);
        const todayIso = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('attendance')
            .select('check_in')
            .eq('user_id', user.id)
            .eq('work_date', todayIso)
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { 
            toast({ title: "خطأ في جلب الجلسة", description: error.message, variant: 'destructive' }); 
        } else if (data) { 
            setSessionStartTime(data.check_in); 
        }
        setIsSessionLoading(false);
    };
    fetchActiveSession();
  }, [user?.id, toast]);
  
  useEffect(() => {
    if (!sessionStartTime) { 
        setSessionDuration('00:00:00'); 
        return; 
    }
    const timer = setInterval(() => {
        const start = new Date(sessionStartTime).getTime();
        const now = new Date().getTime();
        const difference = now - start;
        if (difference < 0) { 
            setSessionDuration('00:00:00'); 
            clearInterval(timer); 
            return; 
        }
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
      console.error("Login error:", error.message); 
      return false; 
    }
    return true;
  };

  const logout = async () => {
    if (user) {
        try {
            const now = new Date();
            // Directly find the active attendance to close it
            const { data: activeAttendance, error: attendanceError } = await supabase
                .from('attendance')
                .select('id, check_in')
                .eq('user_id', user.id)
                .is('check_out', null)
                .order('check_in', { ascending: false })
                .limit(1)
                .single();

            if (attendanceError && attendanceError.code !== 'PGRST116') throw attendanceError;
            if (activeAttendance) {
                const checkInTime = new Date(activeAttendance.check_in).getTime();
                const durationInMinutes = Math.floor((now.getTime() - checkInTime) / (1000 * 60));
                await supabase.from('attendance')
                    .update({ check_out: now.toISOString(), session_duration: durationInMinutes })
                    .eq('id', activeAttendance.id);
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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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
