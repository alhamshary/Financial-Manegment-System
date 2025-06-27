
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      if (currentUser) {
        // Automatically start an attendance session. The RPC handles cases where a session is already active.
        await supabase.rpc('auto_start_attendance', { user_id_param: currentUser.id });
        
        // Fetch profile from public 'users' table
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
        setUser(null);
        setSessionStartTime(null); // Clear session on logout
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
  }, []);

  // Fetch active session when user is available
  useEffect(() => {
    if (!user) {
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
  }, [user, toast]);
  
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
    if (user) {
      await supabase.rpc('end_current_attendance', { user_id_param: user.id });
    }
    await supabase.auth.signOut();
    // onAuthStateChange will handle cleanup and we redirect here
    router.push('/');
  };

  const value = { user, login, logout, loading, sessionDuration, isSessionLoading };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
