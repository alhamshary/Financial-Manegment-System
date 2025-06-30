
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  logout: () => Promise<void>;
  loading: boolean;
  settings: AppSettings | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const logout = useCallback(async () => {
    // End attendance and session in the background. Don't let it block logout.
    if (user?.id) {
        supabase.rpc('end_current_attendance', { user_id_param: user.id })
            .catch(err => console.error("Failed to end attendance on logout:", err));
        
        supabase.from('sessions').select('id').eq('user_id', user.id).is('logout_time', null).limit(1).single()
            .then(({ data, error }) => {
                if (error && error.code !== 'PGRST116') {
                   console.error("Error finding active session for logout:", error);
                }
                if (data) {
                    supabase.from('sessions').update({ logout_time: new Date().toISOString() }).eq('id', data.id)
                        .catch(err => console.error("Failed to update session on logout:", err));
                }
            });
    }

    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  }, [user, router]);


  useEffect(() => {
    // We start with loading=true and only set it to false once we have a user or know there is none.
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user;
        if (currentUser) {
          try {
              // Fetch profile and settings in parallel for speed
              const [profileResult, settingsResult] = await Promise.all([
                supabase.from('users').select('name, role').eq('id', currentUser.id).single(),
                supabase.from('app_settings').select('*').eq('id', true).single()
              ]);

              const { data: profile, error: profileError } = profileResult;
              if (profileError) throw profileError;
              
              setUser({
                id: currentUser.id,
                email: currentUser.email!,
                name: profile.name || currentUser.email!,
                role: (profile.role as UserRole) || 'employee',
              });

              const { data: appSettings } = settingsResult;
              const currentSettings = (appSettings as AppSettings) || { id: true, office_title: 'المكتب الرئيسي', app_theme: 'theme-default' };
              setSettings(currentSettings);
              applyTheme(currentSettings.app_theme);

              // Start attendance and session tracking in the background (fire and forget)
              supabase.rpc('auto_start_attendance', { user_id_param: currentUser.id })
                 .catch(err => toast({ title: "خطأ في بدء الحضور", description: err.message, variant: 'destructive' }));
              
              if (typeof window !== 'undefined') {
                  supabase.from('sessions').insert({ user_id: currentUser.id, login_time: new Date().toISOString(), device_info: navigator.userAgent })
                     .catch(err => console.error("Failed to create session record:", err));
              }

          } catch (error: any) {
              toast({ title: "خطأ في تحميل البيانات", description: error.message, variant: "destructive" });
              await supabase.auth.signOut(); // Log out if critical data is missing
              setUser(null);
              setSettings(null);
          }
        } else {
          // No user, clear state
          setUser(null);
          setSettings(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);
  
  const login = async (email: string, pass: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error("Login error:", error.message);
      return false;
    }
    // onAuthStateChange will handle setting user state and redirecting
    return true;
  };
  
  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({ user, login, logout, loading, settings }), [user, login, logout, loading, settings]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

    