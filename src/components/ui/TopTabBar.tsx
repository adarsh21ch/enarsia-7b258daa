import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface TabOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface TopTabBarProps {
  options: TabOption[]; // Support any number of tabs
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TopTabBar({ options, value, onChange, className }: TopTabBarProps) {
  const gridColsClass = options.length === 2 ? 'grid-cols-2' : options.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
  
  return (
    <Tabs value={value} onValueChange={onChange} className={cn("w-full", className)}>
      <TabsList className={cn("grid w-full h-10 rounded-xl bg-muted/60", gridColsClass)}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="text-[13px] font-semibold gap-1.5 rounded-lg data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}