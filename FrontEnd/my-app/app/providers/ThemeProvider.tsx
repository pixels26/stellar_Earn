'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'stellar_earn_theme';
const DEFAULT_THEME: Theme = 'light';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

/**
 * Safe theme initialization that prevents hydration mismatches
 * Uses server-safe default first, then syncs with client localStorage in useEffect
 */
function useSafeThemeState() {
  // Initialize with safe default to prevent hydration mismatch
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [isHydrated, setIsHydrated] = useState(false);

  // Sync with localStorage and system preferences only on client
  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(
        THEME_STORAGE_KEY
      ) as Theme | null;
      const initialTheme = storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : getSystemTheme();
      setThemeState(initialTheme);
      applyTheme(initialTheme);
    } catch (err) {
      console.warn('Failed to read theme preference:', err);
    }
    setIsHydrated(true);
  }, []);

  return [theme, setThemeState, isHydrated] as const;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState, isHydrated] = useSafeThemeState();

  // Persist theme to localStorage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      applyTheme(theme);
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (err) {
      console.warn('Failed to persist theme preference:', err);
    }
  }, [theme, isHydrated]);

  // Listen for system theme changes
  useEffect(() => {
    if (!isHydrated) return;

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const hasStoredPreference = () => {
        try {
          const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
          return stored === 'dark' || stored === 'light';
        } catch {
          return false;
        }
      };

      const handleSystemChange = () => {
        if (!hasStoredPreference()) {
          const nextTheme = mediaQuery.matches ? 'dark' : 'light';
          setThemeState(nextTheme);
          applyTheme(nextTheme);
        }
      };

      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } catch (err) {
      console.warn('Failed to setup system theme listener:', err);
    }
  }, [isHydrated]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }

  return context;
}
