import { type ReactNode, type ComponentType } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { CreatorAccountSwitcher } from '@/components/creator/CreatorAccountSwitcher';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-call-logo.png';
import { useBranding } from '@/hooks/useBranding';
import { ArrowLeft, Lightbulb, FilePen, Send, BarChart3 } from 'lucide-react';

const CREATOR_TABS: Array<{ path: string; label: string; Icon: ComponentType<{ className?: string }> }> = [
  { path: '/creator/ideas', label: 'Ideas', Icon: Lightbulb },
  { path: '/creator/studio', label: 'Studio', Icon: FilePen },
  { path: '/creator/calendar', label: 'Calendar', Icon: Send },
  { path: '/creator/insights', label: 'Insights', Icon: BarChart3 },
];

/**
 * Shell for the Content Creator sub-section. Self-contained — has its own
 * bottom nav (Ideas / Studio / Calendar / Insights) and a "← Back to CRM"
 * control in the header that returns the user to the main app (/calling).
 * The global CRM BottomNav is intentionally NOT rendered here.
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
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <button
            type="button"
            onClick={() => navigate('/calling')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 -ml-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
            aria-label="Back to CRM"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to CRM</span>
          </button>
          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center sm:justify-start sm:ml-2">
            <img src={logoUrl || nevoraLogo} alt={`${appName} Logo`} className="h-8 w-8 rounded-lg object-cover shadow-sm shrink-0" />
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-base font-bold tracking-tight truncate">{title}</h1>
              <p className="text-[11px] text-muted-foreground font-medium truncate">{subtitle}</p>
            </div>
            <div className="min-w-0 sm:hidden text-center">
              <h1 className="text-sm font-bold tracking-tight truncate">{title}</h1>
            </div>
          </div>
          <CreatorAccountSwitcher />
        </div>
      </header>

      <main className="scrollable-content relative">
        <div className="container py-3 px-4 space-y-4 pb-24">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-2xl border-t border-border/50 pb-[max(env(safe-area-inset-bottom),10px)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {CREATOR_TABS.map(({ path, label, Icon }) => {
            const isActive = location.pathname === path;
            return (
              <NavLink
                key={path}
                to={path}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-0.5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className={cn('text-[11px] font-body', isActive ? 'text-primary font-bold' : 'font-medium')}>{label}</span>
                <span
                  className={cn(
                    'absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-1 rounded-full transition-all',
                    isActive ? 'bg-primary scale-100' : 'bg-transparent scale-0',
                  )}
                />
              </NavLink>
            );
          })}
        </div>
      </nav>
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
