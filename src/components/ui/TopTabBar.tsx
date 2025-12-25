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
  const activeIndex = options.findIndex(opt => opt.value === value);
  
  return (
    <div className="bg-card border-b border-border/50">
      <div className="relative flex">
        {/* Animated sliding indicator */}
        <div 
          className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-out"
          style={{ 
            width: '50%',
            left: activeIndex === 0 ? '0%' : '50%'
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
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-200 relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-transform duration-200",
                isActive && "scale-110"
              )} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}