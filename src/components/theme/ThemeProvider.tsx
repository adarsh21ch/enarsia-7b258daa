import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * App-wide theme provider.
 * - Default: 'light' for all new/first-time users.
 * - Users can switch to dark from Profile → Theme; the choice persists
 *   in localStorage under 'nevorai-theme' until they flip it back.
 * - System-preference following is disabled by product decision.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="nevorai-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
