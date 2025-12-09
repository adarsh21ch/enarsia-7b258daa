import { NavLink, useLocation } from 'react-router-dom';
import { Home, ListTodo, Calendar, List, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/action', icon: ListTodo, label: 'Todo Up' },
  { path: '/dashboard', icon: Calendar, label: 'Follow Up' },
  { path: '/listup', icon: List, label: 'ListUp' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative p-2 rounded-xl transition-all duration-300",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isActive && "scale-110"
                )} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 transition-all duration-300",
                isActive && "text-primary font-semibold"
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
