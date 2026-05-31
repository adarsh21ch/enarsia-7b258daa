import { type ReactNode, type ComponentType } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { CreatorAccountSwitcher } from '@/components/creator/CreatorAccountSwitcher';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-call-logo.png';
import { useBranding } from '@/hooks/useBranding';

/**
 * Shared shell for the Content Creator mode tabs. Header has logo + title on
 * the left and an account switcher chip on the right.
 */
export function CreatorTabLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { logoUrl, appName } = useBranding();
  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoUrl || nevoraLogo} alt={`${appName} Logo`} className="h-10 w-10 rounded-xl object-cover shadow-md shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
              <p className="text-xs text-muted-foreground font-medium truncate">{subtitle}</p>
            </div>
          </div>
          <CreatorAccountSwitcher />
        </div>
      </header>

      <main className="scrollable-content relative">
        <div className="container py-3 px-4 space-y-4 pb-24">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}

export function CreatorEmptyState({
  icon: Icon,
  headline,
  body,
  bullets,
  cta,
}: {
  icon: ComponentType<{ className?: string }>;
  headline: string;
  body: string;
  bullets?: string[];
  cta?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 flex flex-col items-center text-center">
      <div className="p-3 rounded-2xl bg-primary/10 mb-4">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-lg font-bold mb-1.5">{headline}</h2>
      <p className="text-sm text-muted-foreground max-w-sm">{body}</p>

      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-2 text-left w-full max-w-sm">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-foreground/90">{b}</span>
            </li>
          ))}
        </ul>
      )}

      {cta && (
        <div className={cn('mt-5 w-full max-w-sm rounded-xl px-4 py-2.5 text-sm font-semibold bg-muted text-muted-foreground border border-border/50 cursor-default select-none')}>
          {cta} · coming soon
        </div>
      )}
    </div>
  );
}
