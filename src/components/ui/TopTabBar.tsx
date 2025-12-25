import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  className?: string;
}

export function TopTabBar({ options, value, onChange, className }: TopTabBarProps) {
  return (
    <Tabs value={value} onValueChange={onChange} className={cn("w-full", className)}>
      <TabsList className="grid w-full grid-cols-2 h-9">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="text-xs font-medium gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {option.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}