
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect } from 'react';
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
  login: (email: string, pass:string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  settings: AppSettings | null;
  sessionDuration: string;
  isSessionLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [dbSessionId, setDbSessionId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id) {
      const fetchActiveDbSession = async () => {
        const { data, error } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .is('logout_time', null)
          .order('login_time', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching active DB session:", error);
        } else if (data) {
          setDbSessionId(data.id);
        }
      };
      
      if (!dbSessionId) {
        fetchActiveDbSession();
      }
    }
  }, [user, dbSessionId]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      if (currentUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', currentUser.id)
          .single();

        setUser({
          id: currentUser.id,
          email: currentUser.email!,
          name: profile?.name || currentUser.email!,
          role: (profile?.role as UserRole) || 'employee',
        });
        
        if (event === 'SIGNED_IN') {
            try {
                await supabase.rpc('auto_start_attendance', { user_id_param: currentUser.id });
                const { data: sessionRecord, error: sessionError } = await supabase
                    .from('sessions')
                    .insert({
                        user_id: currentUser.id,
                        login_time: new Date().toISOString(),
                        device_info: navigator.userAgent,
                    })
                    .select('id')
                    .single();
                if (sessionError) throw sessionError;
                setDbSessionId(sessionRecord.id);
            } catch (error: any) {
                toast({
                    title: 'خطأ في بدء الجلسة',
                    description: `لم نتمكن من تسجيل جلسة الحضور أو الدخول بشكل صحيح: ${error.message}`,
                    variant: 'destructive',
                });
            }
        }
      } else {
        setUser(null);
        setSessionStartTime(null);
        setDbSessionId(null);
      }
      // Note: We keep loading true until settings are also fetched.
    });
    
    const getInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoading(false);
            setIsSessionLoading(false);
        }
    };
    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  // Fetch and subscribe to app settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('office_title, app_theme')
        .eq('id', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching app settings:", error);
      }
      
      if (data) {
        setSettings(data as AppSettings);
      } else {
        setSettings({ id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' });
      }

      setLoading(false); // End loading after user and settings are fetched
    };

    fetchSettings();

    const channel = supabase
      .channel('public:app_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'id=eq.true' },
        (payload) => {
          setSettings(payload.new as AppSettings);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Apply theme when settings change
  useEffect(() => {
    if (settings?.app_theme) {
      applyTheme(settings.app_theme);
    }
  }, [settings?.app_theme]);

  // Fetch active attendance session when user is available
  useEffect(() => {
    if (!user?.id) {
        setSessionStartTime(null);
        setIsSessionLoading(false);
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
  
  // Run timer interval
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

        setSessionDuration(
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStartTime]);

  useEffect(() => {
    if (loading) return;
    
    if (user && pathname === '/') {
      router.replace('/dashboard');
    } 
    else if (!user && pathname !== '/') {
      router.replace('/');
    }
  }, [user, loading, pathname, router]);
  
  const login = async (email: string, pass: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error("Login error:", error.message);
      return false;
    }
    return true;
  };

  const logout = async () => {
    if (user && dbSessionId) {
        try {
            const now = new Date();

            const { data: activeAttendance, error: findError } = await supabase
                .from('attendance')
                .select('id, check_in')
                .eq('user_id', user.id)
                .is('check_out', null)
                .order('check_in', { ascending: false })
                .limit(1)
                .single();

            if (findError && findError.code !== 'PGRST116') {
                throw findError;
            }

            if (activeAttendance) {
                const checkInTime = new Date(activeAttendance.check_in).getTime();
                const nowTime = now.getTime();
                const durationInMs = nowTime - checkInTime;
                const durationInMinutes = Math.floor(durationInMs / (1000 * 60));

                const { error: updateError } = await supabase
                    .from('attendance')
                    .update({
                        check_out: now.toISOString(),
                        session_duration: durationInMinutes,
                    })
                    .eq('id', activeAttendance.id);
                
                if (updateError) throw updateError;
            }

            await supabase
                .from('sessions')
                .update({ logout_time: now.toISOString() })
                .eq('id', dbSessionId);

        } catch (error: any) {
             toast({
                title: 'خطأ في إنهاء الجلسة',
                description: `لم نتمكن من إيقاف الجلسة بشكل صحيح: ${error.message}`,
                variant: 'destructive',
            });
        }
    }
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  const value = { user, login, logout, loading, settings, sessionDuration, isSessionLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
