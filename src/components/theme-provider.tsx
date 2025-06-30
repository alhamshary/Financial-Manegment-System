
"use client";

// Defines the color values for different themes.
// The key (e.g., 'theme-green') must match the value stored in the app_settings table in Supabase.
// The values (e.g., '145 74% 36%') are HSL color strings without the 'hsl()' wrapper.
export const themeColors: { [key: string]: { primary: string, accent: string, ring: string } } = {
  'theme-default': { primary: '207 49% 37%', accent: '194 51% 68%', ring: '207 49% 37%' },
  'theme-rose':    { primary: '348 78% 49%', accent: '330 84% 83%', ring: '348 78% 49%' },
  'theme-green':   { primary: '145 74% 36%', accent: '145 63% 59%', ring: '145 74% 36%' },
  'theme-orange':  { primary: '25 95% 53%', accent: '28 96% 61%', ring: '25 95% 53%' },
};

/**
 * Applies a theme by setting CSS variables on the root element.
 * @param themeName The name of the theme to apply (e.g., 'theme-green').
 */
export const applyTheme = (themeName: string) => {
    // Guard against running in a non-browser environment (e.g., during server-side rendering).
    if (typeof document === 'undefined') return;

    // Fallback to the default theme if the provided themeName doesn't exist.
    const colors = themeColors[themeName] || themeColors['theme-default'];
    
    const root = document.documentElement;

    // Set the CSS variables for the primary color, accent color, and ring color.
    // These variables are used in globals.css and tailwind.config.ts to style the application.
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--ring', colors.ring);
};
