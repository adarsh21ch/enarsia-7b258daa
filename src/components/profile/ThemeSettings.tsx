import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Simplified theme picker:
 *  - One toggle switch: Light ⇄ Dark
 *  - Checkbox below: "Use system default" (overrides the toggle)
 */
export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSystem = mounted && theme === 'system';
  // What the toggle should show: when on system, reflect resolved; otherwise reflect explicit choice
  const effective = mounted ? (isSystem ? resolvedTheme : theme) : 'light';
  const isDark = effective === 'dark';

  const handleToggle = (checked: boolean) => {
    // Switching the toggle implies an explicit choice (turns system off)
    setTheme(checked ? 'dark' : 'light');
  };

  const handleSystemToggle = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setTheme('system');
    } else {
      // Lock in the currently shown appearance as the explicit choice
      setTheme(resolvedTheme === 'dark' ? 'dark' : 'light');
    }
  };

  return (
    <div className="px-2 py-1 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pt-1 pb-1">
        Theme
      </p>

      {/* Light ⇄ Dark toggle row */}
      <div
        className={cn(
          'flex items-center justify-between p-2.5 rounded-lg',
          'bg-muted/40'
        )}
      >
        <div className="flex items-center gap-2.5">
          {isDark ? (
            <Moon className="h-4 w-4 text-primary" />
          ) : (
            <Sun className="h-4 w-4 text-primary" />
          )}
          <div className="text-left">
            <span className="text-sm block leading-tight font-medium">
              {isDark ? 'Dark' : 'Light'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {isDark ? 'Easy on the eyes' : 'Bright, daytime UI'}
            </span>
          </div>
        </div>
        <Switch
          checked={isDark}
          onCheckedChange={handleToggle}
          disabled={isSystem}
          aria-label="Toggle dark mode"
        />
      </div>

      {/* Use system default checkbox */}
      <label
        htmlFor="theme-system-default"
        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer"
      >
        <div className="text-left">
          <span className="text-sm block leading-tight">Use system default</span>
          <span className="text-[10px] text-muted-foreground">
            Follow your device setting
            {isSystem && systemTheme ? ` (currently ${systemTheme})` : ''}
          </span>
        </div>
        <Checkbox
          id="theme-system-default"
          checked={isSystem}
          onCheckedChange={handleSystemToggle}
        />
      </label>
    </div>
  );
}
