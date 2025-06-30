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
export interface TimerContextType {
  sessionDuration: string;
  isSessionLoading: boolean;
}

// Contexts
export const AuthContext = createContext<AuthContextType | null>(null);
export const TimerContext = createContext<TimerContextType | null>(null);

// Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true); // Gatekeeper for the entire app

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // Timer State
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [activeSessionStartTime, setActiveSessionStartTime] = useState<string | null>(null);

  // --- Core Authentication and Settings Logic ---
  // This is the single source of truth. It runs once on mount.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // This function will run on initial load and on login/logout.

        if (session?.user) {
          // User is logged in. Fetch profile and settings concurrently.
          try {
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
            if (settingsError && settingsError.code !== 'PGRST116') {
               throw settingsError;
            }

            // Set user state
            setUser({
              id: profile.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role as UserRole,
            });

            // Set settings state and apply theme
            const loadedSettings = appSettings || { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' };
            setSettings(loadedSettings);
            applyTheme(loadedSettings.app_theme);

          } catch (error: any) {
            toast({ title: 'خطأ في تحميل البيانات', description: error.message, variant: 'destructive' });
            // If data fetching fails, log the user out to be safe.
            await supabase.auth.signOut();
            setUser(null);
            setSettings(null);
          }
        } else {
          // User is logged out.
          setUser(null);
          // Load default settings for the login page
          const { data: appSettings } = await supabase.from('app_settings').select('*').eq('id', true).single();
          const loadedSettings = appSettings || { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' };
          setSettings(loadedSettings);
          applyTheme(loadedSettings.app_theme);
        }

        // --- Crucial Step ---
        // Loading is complete only after all auth checks and data fetches are done.
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on initial mount

  // --- Redirection Logic ---
  // Runs whenever loading state or user changes.
  useEffect(() => {
    if (loading) return; // Don't redirect while still loading.

    const isAuthPage = pathname === '/';
    if (user && isAuthPage) {
      router.replace('/dashboard');
    } else if (!user && !isAuthPage) {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);

  // --- Login/Logout Handlers ---
  const login = async (email: string, pass: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error('Login error:', error.message);
      return false;
    }
    // onAuthStateChange will handle setting the user and redirecting.
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
    // onAuthStateChange will handle clearing the user state.
    // The redirection useEffect will then handle redirecting to '/'.
  };

  // --- Timer Logic ---
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
    const timerId = setInterval(() => {
      const start = new Date(activeSessionStartTime).getTime();
      const now = new Date().getTime();
      const difference = now - start;
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setSessionDuration(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timerId);
  }, [activeSessionStartTime]);


  // --- Context Values ---
  const authValue = useMemo(() => ({ user, loading, settings, login, logout }), [user, loading, settings, logout]);
  const timerValue = useMemo(() => ({ sessionDuration, isSessionLoading }), [sessionDuration, isSessionLoading]);

  // The global loading gate. This shows a spinner until auth status is known and initial data is fetched.
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
