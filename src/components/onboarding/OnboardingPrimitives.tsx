import { ReactNode } from 'react';

interface CoachMarkProps {
  children: ReactNode;
}

/** Semi-transparent dark backdrop with a content bubble */
export function CoachMarkOverlay({ children }: CoachMarkProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content bubble */}
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border p-5 max-w-sm w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {children}
      </div>
    </div>
  );
}

interface FullScreenCardProps {
  children: ReactNode;
}

/** Full-screen card for welcome / completion screens */
export function FullScreenCard({ children }: FullScreenCardProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full space-y-6 animate-in fade-in zoom-in-95 duration-400">
        {children}
      </div>
    </div>
  );
}

/** Progress indicator */
export function OnboardingProgress({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Step {current} of {total}</span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Pulsing ring for spotlight targets */
export function PulsingRing({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 rounded-xl pointer-events-none ${className}`}>
      <div className="absolute inset-0 rounded-xl border-2 border-primary/60 animate-pulse" />
      <div className="absolute -inset-1 rounded-xl border border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
    </div>
  );
}

/** CSS confetti for completion screen */
export function Confetti() {
  const colors = ['#3B6FFF', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[201] overflow-hidden">
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[i % colors.length],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}
