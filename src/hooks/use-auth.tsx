
"use client";

import { useContext } from 'react';
import { AuthContext, TimerContext, type AuthContextType, type TimerContextType } from '@/components/auth-provider';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useTimer = (): TimerContextType => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimer must be used within an AuthProvider');
    }
    return context;
};
