import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type ThemeOption = 'light' | 'dark' | 'system';

const OPTIONS: Array<{ value: ThemeOption; label: string; icon: typeof Sun; description: string }> = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Bright, daytime UI' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  { value: 'system', label: 'System Default', icon: Monitor, description: 'Follow device setting' },
];

/**
 * Radio-style theme picker for Profile → Settings.
 * Uses next-themes; persists in localStorage automatically.
 */
export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only show selected state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (mounted ? theme : 'system') as ThemeOption;

  return (
    <div className="px-2 py-1 space-y-0.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pt-1 pb-1.5">
        Theme
      </p>
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = current === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
              selected ? 'bg-primary/10' : 'hover:bg-muted/50'
            )}
            aria-pressed={selected}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={cn('h-3.5 w-3.5', selected ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-left">
                <span className={cn('text-sm block leading-tight', selected && 'font-medium text-primary')}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{opt.description}</span>
              </div>
            </div>
            <div
              className={cn(
                'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors',
                selected ? 'border-primary bg-primary' : 'border-border'
              )}
            >
              {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
