import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

/**
 * Top-level theme row — single Light ⇄ Dark toggle.
 * - No "system default" option (per product decision).
 * - Choice persists via next-themes (localStorage 'theme').
 * - On mount, any legacy 'system' value is migrated to the resolved
 *   appearance so the user's choice stays locked until they flip it.
 */
export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Migrate any legacy 'system' preference to an explicit choice.
  useEffect(() => {
    if (!mounted) return;
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'dark' : 'light');
    }
  }, [mounted, theme, resolvedTheme, setTheme]);

  const isDark = mounted ? (theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark')) : false;

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={() => handleToggle(!isDark)}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50 hover:bg-muted/50 transition-colors"
      aria-label="Toggle dark mode"
    >
      <div className="flex items-center gap-2.5">
        {isDark ? (
          <Moon className="h-4 w-4 text-primary" />
        ) : (
          <Sun className="h-4 w-4 text-primary" />
        )}
        <div className="text-left">
          <span className="font-medium text-sm block leading-tight">
            {isDark ? 'Dark Theme' : 'Light Theme'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {isDark ? 'Easy on the eyes' : 'Bright, daytime UI'}
          </span>
        </div>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        aria-label="Toggle dark mode"
        onClick={(e) => e.stopPropagation()}
      />
    </button>
  );
}
