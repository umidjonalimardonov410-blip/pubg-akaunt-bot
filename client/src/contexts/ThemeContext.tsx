import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AppTheme = "dark" | "neon" | "gamer";

export const APP_THEMES: { id: AppTheme; label: string; hint: string; swatch: string }[] = [
  { id: "dark", label: "Dark", hint: "Klassik qora + tilla", swatch: "linear-gradient(135deg,#0b0c0f,#f5c542)" },
  { id: "neon", label: "Neon", hint: "Siyan/pushti neon nur", swatch: "linear-gradient(135deg,#08111a,#35d0ff,#ff3ea5)" },
  { id: "gamer", label: "Gamer", hint: "Yashil-pushti gaming", swatch: "linear-gradient(135deg,#07100c,#39ff88,#b026ff)" },
];

const STORAGE_KEY = "inferno-theme";

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (next: AppTheme) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
  switchable?: boolean;
}

function readStoredTheme(fallback: AppTheme): AppTheme {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "neon" || stored === "gamer" ? stored : fallback;
}

export function ThemeProvider({ children, defaultTheme = "dark", switchable = true }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<AppTheme>(() => (switchable ? readStoredTheme(defaultTheme) : defaultTheme));

  useEffect(() => {
    const root = document.documentElement;
    // Barcha temalar dark asosida ishlaydi.
    root.classList.add("dark");
    root.classList.remove("theme-dark", "theme-neon", "theme-gamer");
    root.classList.add(`theme-${theme}`);
    root.dataset.theme = theme;
    if (switchable) {
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch {}
    }
  }, [theme, switchable]);

  const setTheme = useCallback(
    (next: AppTheme) => {
      if (!switchable) return;
      setThemeState(next);
    },
    [switchable],
  );

  const toggleTheme = switchable
    ? () => setThemeState(prev => (prev === "dark" ? "neon" : prev === "neon" ? "gamer" : "dark"))
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, switchable }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // Provider bo'lmasa ham UI qulab tushmasin.
  if (!context) {
    return { theme: "dark" as AppTheme, setTheme: () => {}, toggleTheme: undefined, switchable: false };
  }
  return context;
}
