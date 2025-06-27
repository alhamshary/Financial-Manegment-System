"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user;
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email!,
          // Supabase stores custom data in user_metadata
          name: currentUser.user_metadata.name || 'User',
          role: currentUser.user_metadata.role || 'employee',
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    await supabase.auth.signOut();
    // onAuthStateChange will handle cleanup and we redirect here
    router.push('/');
  };

  const value = { user, login, logout, loading };

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
