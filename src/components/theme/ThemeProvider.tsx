import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * App-wide theme provider.
 * - Default: 'system' (follows OS dark/light setting)
 * - Persists choice in localStorage under 'nevorai-theme'
 * - Toggles `dark` class on <html> so Tailwind dark: variants apply
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="nevorai-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
