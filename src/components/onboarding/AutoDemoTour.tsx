import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAutoDemoTour, DemoTourState } from '@/hooks/useAutoDemoTour';
import { useProfile } from '@/hooks/useProfile';
import { Confetti } from './OnboardingPrimitives';
import { Loader2, X } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-call-logo.png';

/* ─── Step Definitions ─── */
interface TourStep {
  title: string;
  description: string;
  selector: string;
  navigateTo: string;
  autoAction?: 'scroll' | 'click' | 'none';
}

const TOUR_STEPS: Record<number, TourStep> = {
  1: {
    title: 'Your Leads List',
    description: 'This is where all your prospects live. Every person you want to call is listed here.',
    selector: '[data-onboarding="lead-list"]',
    navigateTo: '/dashboard',
    autoAction: 'scroll',
  },
  2: {
    title: 'Click a Lead to Open',
    description: 'Tap any lead to expand their full details — phone, notes, call history and more.',
    selector: '[data-onboarding="lead-row-1"]',
    navigateTo: '/dashboard',
    autoAction: 'click',
  },
  3: {
    title: 'Mark Their Response',
    description: 'After a call, mark what happened — Enrolled, Busy, Not Interested, etc.',
    selector: '[data-onboarding="response-select"]',
    navigateTo: '/dashboard',
    autoAction: 'none',
  },
  4: {
    title: 'Filter Your Leads',
    description: 'Use Retargeting to filter leads by their status. Call only the ones who said "Busy" or "Follow Up".',
    selector: '[data-onboarding="retargeting-btn"]',
    navigateTo: '/dashboard',
    autoAction: 'none',
  },
  5: {
    title: 'Organise with Sheets',
    description: 'Create multiple sheets like Excel tabs — one for each campaign, batch or city.',
    selector: '[data-onboarding="add-sheet-btn"]',
    navigateTo: '/dashboard',
    autoAction: 'none',
  },
  6: {
    title: 'Import Your Leads',
    description: 'Import leads from Excel or CSV in one click. Map your columns and you\'re done.',
    selector: '[data-onboarding="import-btn"]',
    navigateTo: '/dashboard',
    autoAction: 'none',
  },
  7: {
    title: 'Follow-Up Tab',
    description: 'See everything that happened — every call, every status change — in a live activity feed.',
    selector: '[data-onboarding="nav-followup"]',
    navigateTo: '/dashboard',
    autoAction: 'none',
  },
  8: {
    title: 'Prospects by Tag',
    description: 'Switch to this view to see all leads grouped by their response tag.',
    selector: '[data-onboarding="prospects-tab"]',
    navigateTo: '/listup',
    autoAction: 'none',
  },
  9: {
    title: 'Filter by Tag',
    description: 'Tap any tag to instantly see only those leads. Focus on "Busy" leads? One tap.',
    selector: '[data-onboarding="tag-filter-row"]',
    navigateTo: '/listup',
    autoAction: 'none',
  },
  10: {
    title: 'TrackUp — Your Performance',
    description: 'See your daily stats — leads added, calls made, enrolments done. Track your progress every day.',
    selector: '[data-onboarding="nav-trackup"]',
    navigateTo: '/listup',
    autoAction: 'none',
  },
  11: {
    title: 'Daily Breakdown',
    description: 'Every day is tracked here. See your best days, your slow days, and your total monthly performance.',
    selector: '[data-onboarding="trackup-table"]',
    navigateTo: '/tracking',
    autoAction: 'none',
  },
  12: {
    title: 'The Funnel',
    description: 'See which leads have moved into your sales pipeline and which stage they are at.',
    selector: '[data-onboarding="funnel-tab"]',
    navigateTo: '/dashboard',
    autoAction: 'none',
  },
};

const STEP_DURATION = 3500; // 3.5s per step
const NAV_DELAY = 1000; // wait for page to render

/* ─── Spotlight Overlay ─── */
function SpotlightOverlay({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 9000,
          pointerEvents: 'all',
          transition: 'all 0.3s ease',
        }}
      />
    );
  }

  const pad = 10;
  const x = targetRect.left - pad;
  const y = targetRect.top - pad;
  const w = targetRect.width + pad * 2;
  const h = targetRect.height + pad * 2;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        pointerEvents: 'all',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Dark overlay with cutout using box-shadow trick */}
      <div
        style={{
          position: 'absolute',
          top: y,
          left: x,
          width: w,
          height: h,
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
          pointerEvents: 'none',
          transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
        }}
      />
      {/* Pulsing border around target */}
      <div
        style={{
          position: 'absolute',
          top: y - 2,
          left: x - 2,
          width: w + 4,
          height: h + 4,
          borderRadius: 14,
          border: '2.5px solid hsl(var(--primary))',
          animation: 'auto-demo-pulse 2s ease-in-out infinite',
          pointerEvents: 'none',
          transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
        }}
      />
    </div>
  );
}

/* ─── Step Tooltip Card ─── */
function StepTooltip({
  step,
  totalSteps,
  title,
  description,
  targetRect,
}: {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  targetRect: DOMRect | null;
}) {
  // Position the tooltip below or above the target
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: 16,
    right: 16,
    zIndex: 9500,
    maxWidth: 400,
    margin: '0 auto',
    transition: 'all 0.3s ease',
  };

  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    if (spaceBelow > 180) {
      tooltipStyle.top = targetRect.bottom + 16;
    } else {
      tooltipStyle.bottom = window.innerHeight - targetRect.top + 16;
    }
  } else {
    tooltipStyle.top = '50%';
    tooltipStyle.transform = 'translateY(-50%)';
  }

  return (
    <div style={tooltipStyle} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className="bg-card rounded-2xl border border-border/60 p-4"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
      >
        {/* Step badge */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            Step {step} of {totalSteps}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i + 1 === step ? 16 : 6,
                  background: i + 1 <= step ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                }}
              />
            ))}
          </div>
        </div>

        <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

        {/* Auto-advance indicator */}
        <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{
              animation: `auto-demo-progress ${STEP_DURATION}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Main AutoDemoTour Component ─── */
export function AutoDemoTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const {
    tourState,
    currentStep,
    totalSteps,
    startTour,
    skipTour,
    advanceStep,
    completeTour,
    setTourState,
  } = useAutoDemoTour();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigatingRef = useRef(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Handle step changes: navigate + find target + auto-advance
  useEffect(() => {
    if (tourState !== 'touring' || currentStep < 1 || currentStep > totalSteps) return;

    const stepDef = TOUR_STEPS[currentStep];
    if (!stepDef) return;

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Navigate if needed
    if (location.pathname !== stepDef.navigateTo) {
      isNavigatingRef.current = true;
      navigate(stepDef.navigateTo);
      
      // Wait for navigation + render
      timerRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
        findAndHighlight(stepDef);
        scheduleAdvance();
      }, NAV_DELAY);
    } else {
      findAndHighlight(stepDef);
      scheduleAdvance();
    }

    function findAndHighlight(step: TourStep) {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        // Scroll into view if needed
        if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Update rect after scroll
          setTimeout(() => {
            setTargetRect(el.getBoundingClientRect());
          }, 400);
        }

        // Auto-actions
        if (step.autoAction === 'click') {
          setTimeout(() => el.click(), 800);
        } else if (step.autoAction === 'scroll') {
          el.scrollTo({ top: 60, behavior: 'smooth' });
          setTimeout(() => el.scrollTo({ top: 0, behavior: 'smooth' }), 1200);
        }
      } else {
        setTargetRect(null);
      }
    }

    function scheduleAdvance() {
      timerRef.current = setTimeout(() => {
        if (currentStep >= totalSteps) {
          setTourState('completing');
        } else {
          advanceStep();
        }
      }, STEP_DURATION);
    }

    // Keep updating target rect (element may move)
    const interval = setInterval(() => {
      if (isNavigatingRef.current) return;
      const el = document.querySelector(stepDef.selector) as HTMLElement | null;
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    }, 300);

    return () => {
      clearInterval(interval);
    };
  }, [currentStep, tourState]);

  // ═══ RENDER: Nothing ═══
  if (tourState === 'idle' || tourState === 'loading') return null;

  // ═══ RENDER: Welcome Screen ═══
  if (tourState === 'welcome') {
    return (
      <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-6">
        <div
          className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-5 animate-in fade-in zoom-in-95 duration-300 text-center"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
        >
          <img src={nevoraLogo} alt="Nevorai CRM" className="w-16 h-16 rounded-2xl shadow-lg mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Welcome to Nevorai CRM! 👋</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You're new here! Would you like a quick 60-second demo to see how the app works?
          </p>
          <button
            onClick={startTour}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base border-none cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            Yes, show me! ✨
          </button>
          <button
            onClick={skipTour}
            className="text-sm text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer transition-colors"
          >
            Skip, I'll explore myself
          </button>
        </div>
      </div>
    );
  }

  // ═══ RENDER: Seeding ═══
  if (tourState === 'seeding') {
    return (
      <div className="fixed inset-0 z-[10000] bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 animate-in fade-in duration-300">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Setting up your demo...</p>
        </div>
      </div>
    );
  }

  // ═══ RENDER: Completing ═══
  if (tourState === 'completing') {
    const firstName = profile?.display_name?.split(' ')[0] || 'there';
    return (
      <>
        <Confetti />
        <div className="fixed inset-0 z-[10000] bg-background flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <svg viewBox="0 0 52 52" className="w-12 h-12">
                <circle cx="26" cy="26" r="24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                <path
                  fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round"
                  d="M14 27l8 8 16-16"
                  style={{ strokeDasharray: 48, strokeDashoffset: 48, animation: 'draw-check 0.5s 0.3s ease forwards' }}
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">You're all set, {firstName}! 🚀</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
              Now you know how Nevorai CRM works. Let&apos;s clear the demo data and get you started for real!
            </p>
            <button
              onClick={async () => {
                await completeTour();
                navigate('/dashboard');
              }}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base border-none cursor-pointer hover:opacity-90 transition-opacity"
            >
              Start Using Nevorai CRM →
            </button>
          </div>
        </div>
      </>
    );
  }

  // ═══ RENDER: Touring ═══
  if (tourState === 'touring') {
    const stepDef = TOUR_STEPS[currentStep];
    if (!stepDef) return null;

    const overallProgress = (currentStep / totalSteps) * 100;

    return (
      <>
        {/* Top progress bar */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 10000, background: 'hsl(var(--muted))' }}>
          <div
            style={{
              height: '100%',
              background: 'hsl(var(--primary))',
              width: `${overallProgress}%`,
              transition: 'width 0.4s ease',
              borderRadius: '0 2px 2px 0',
            }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={skipTour}
          className="fixed top-3 right-3 z-[10001] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-card/90 backdrop-blur-sm text-muted-foreground border border-border/60 hover:text-foreground transition-colors"
          style={{ pointerEvents: 'all' }}
        >
          <X className="h-3.5 w-3.5" />
          Skip Tour
        </button>

        {/* Spotlight overlay */}
        <SpotlightOverlay targetRect={targetRect} />

        {/* Tooltip */}
        <StepTooltip
          step={currentStep}
          totalSteps={totalSteps}
          title={stepDef.title}
          description={stepDef.description}
          targetRect={targetRect}
        />
      </>
    );
  }

  return null;
}
