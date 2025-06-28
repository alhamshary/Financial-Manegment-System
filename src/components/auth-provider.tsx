
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, pass:string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
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

  // Session timer state
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Database session state
  const [dbSessionId, setDbSessionId] = useState<number | null>(null);


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      if (currentUser) {
        // This is a login or session refresh event
        if (event === 'SIGNED_IN') { // Only run this block on initial login, not on every token refresh
            try {
                // 1. Start attendance session via RPC. This handles new logins and cleans up old sessions.
                const { error: rpcError } = await supabase.rpc('auto_start_attendance', { user_id_param: currentUser.id });
                if (rpcError) throw rpcError;

                // 2. Start a new session in the 'sessions' table
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
        
        // 3. Fetch user profile
        const { data: profile } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', currentUser.id)
          .single();

        setUser({
          id: currentUser.id,
          email: currentUser.email!,
          // Fallback to email if name/role not in profile yet
          name: profile?.name || currentUser.email!,
          role: (profile?.role as UserRole) || 'employee',
        });

      } else {
        // This is a logout event, clear all local state
        setUser(null);
        setSessionStartTime(null); // Clear timer
        setDbSessionId(null); // Clear db session id
      }
      setLoading(false);
    });
    
    // Set loading to false if there is no session on initial load
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // Fetch active session when user is available
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
    
    // If user is logged in and on the login page, redirect to dashboard
    if (user && pathname === '/') {
      router.replace('/dashboard');
    } 
    // If user is not logged in and not on the login page, redirect to login
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
    // onAuthStateChange will handle setting the user and redirecting
    return true;
  };

  const logout = async () => {
    // End attendance and session records before signing out
    if (user && dbSessionId) {
        try {
            // 1. End attendance session in 'attendance' table
            const { error: attendanceError } = await supabase.rpc('end_current_attendance', { user_id_param: user.id });
            if (attendanceError) throw attendanceError;
            
            // 2. End session in 'sessions' table
            const { error: sessionError } = await supabase
                .from('sessions')
                .update({ logout_time: new Date().toISOString() })
                .eq('id', dbSessionId);
            if (sessionError) throw sessionError;

        } catch (error: any) {
             toast({
                title: 'خطأ في إنهاء الجلسة',
                description: `لم نتمكن من إيقاف الجلسة بشكل صحيح: ${error.message}`,
                variant: 'destructive',
            });
        }
    }
    // Now, sign out from Supabase auth. This will trigger onAuthStateChange to clear local state.
    await supabase.auth.signOut();
    router.push('/');
  };

  const value = { user, login, logout, loading, sessionDuration, isSessionLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
