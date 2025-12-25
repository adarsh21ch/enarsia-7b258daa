import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface TabOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface TopTabBarProps {
  options: [TabOption, TabOption];
  value: string;
  onChange: (value: string) => void;
}

export function TopTabBar({ options, value, onChange }: TopTabBarProps) {
  return (
    <div className="bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-2">
      {/* Segmented control - matching To-Do screen style */}
      <div className="relative flex h-9 w-full rounded-md bg-muted p-1">
        {/* Animated sliding background */}
        <div 
          className="absolute top-1 h-7 w-[calc(50%-4px)] rounded-sm bg-background shadow-sm transition-all duration-200 ease-out"
          style={{ 
            left: value === options[0].value ? '4px' : 'calc(50% + 0px)'
          }}
        />
        
        {options.map((option) => {
          const isActive = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors duration-200",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}