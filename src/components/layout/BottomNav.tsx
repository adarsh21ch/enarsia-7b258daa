import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, CheckSquare, Home, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', icon: Calendar, label: 'Follow Up' },
  { path: '/tracking', icon: CheckSquare, label: 'TrackUp' },
  { path: '/', icon: Home, label: 'Home' },
  { path: '/learn', icon: BookOpen, label: 'LearnUp' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
              <span className={cn(
                "text-xs font-medium",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-t-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
