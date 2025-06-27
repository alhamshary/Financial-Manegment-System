
"use client";

import { useEffect } from 'react';

const themeColors: { [key: string]: { primary: string, accent: string, ring: string } } = {
  'theme-default': { primary: '207 49% 37%', accent: '194 51% 68%', ring: '207 49% 37%' },
  'theme-rose':    { primary: '348 78% 49%', accent: '330 84% 83%', ring: '348 78% 49%' },
  'theme-green':   { primary: '145 74% 36%', accent: '145 63% 59%', ring: '145 74% 36%' },
  'theme-orange':  { primary: '25 95% 53%', accent: '28 96% 61%', ring: '25 95% 53%' },
};

export const applyTheme = (themeName: string) => {
    const colors = themeColors[themeName] || themeColors['theme-default'];
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--ring', colors.ring);
};


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('appTheme') || 'theme-default';
    applyTheme(savedTheme);
  }, []);

  return <>{children}</>;
}
