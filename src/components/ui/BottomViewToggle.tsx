import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface ToggleOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface BottomViewToggleProps {
  options: [ToggleOption, ToggleOption];
  value: string;
  onChange: (value: string) => void;
}

export function BottomViewToggle({ options, value, onChange }: BottomViewToggleProps) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 flex justify-center px-4 pb-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 bg-card/95 backdrop-blur-xl border border-border/50 rounded-full p-1 shadow-lg shadow-black/10">
        {options.map((option) => {
          const isActive = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{option.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-70" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
