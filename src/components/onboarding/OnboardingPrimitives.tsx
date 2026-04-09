import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

/* ─── Blocking Overlay ─── */
export function BlockingOverlay() {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toast('Complete the current step first 👆', { duration: 1500 });
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(0,0,0,0.45)',
        pointerEvents: 'all',
        touchAction: 'none',
      }}
    />
  );
}

/* ─── useTargetElevation ─── */
interface ElevationResult {
  found: boolean;
  ready: boolean;
  rect: DOMRect | null;
}

const ORIGINAL_STYLES_KEY = '__onb_original';

function saveOriginalStyles(el: HTMLElement) {
  if ((el as any)[ORIGINAL_STYLES_KEY]) return;
  (el as any)[ORIGINAL_STYLES_KEY] = {
    position: el.style.position,
    zIndex: el.style.zIndex,
    pointerEvents: el.style.pointerEvents,
    boxShadow: el.style.boxShadow,
    borderRadius: el.style.borderRadius,
    outline: el.style.outline,
    outlineOffset: el.style.outlineOffset,
    transition: el.style.transition,
  };
}

function restoreOriginalStyles(el: HTMLElement) {
  const orig = (el as any)[ORIGINAL_STYLES_KEY];
  if (!orig) return;
  el.style.position = orig.position;
  el.style.zIndex = orig.zIndex;
  el.style.pointerEvents = orig.pointerEvents;
  el.style.boxShadow = orig.boxShadow;
  el.style.borderRadius = orig.borderRadius;
  el.style.outline = orig.outline;
  el.style.outlineOffset = orig.outlineOffset;
  el.style.transition = orig.transition;
  delete (el as any)[ORIGINAL_STYLES_KEY];
}

function applyElevationStyles(el: HTMLElement) {
  saveOriginalStyles(el);
  el.style.position = 'relative';
  el.style.zIndex = '9999';
  el.style.pointerEvents = 'all';
  el.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.4), 0 0 24px 4px rgba(37,99,235,0.12)';
  el.style.borderRadius = '8px';
  el.style.outline = '2.5px solid #2563EB';
  el.style.outlineOffset = '2px';
  el.style.transition = 'box-shadow 0.3s ease, outline 0.3s ease';
}

function scrollIntoViewSafely(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    // Check if inside a scrollable container
    let parent = el.parentElement;
    let scrollContainer: HTMLElement | null = null;
    while (parent) {
      const style = getComputedStyle(parent);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        parent.scrollHeight > parent.clientHeight
      ) {
        scrollContainer = parent;
        break;
      }
      parent = parent.parentElement;
    }

    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const isVisible = rect.top >= 60 && rect.bottom <= viewportH - 80;

    if (isVisible) {
      resolve();
      return;
    }

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetOffset = rect.top - containerRect.top + scrollContainer.scrollTop;
      const scrollTo = targetOffset - containerRect.height / 2 + rect.height / 2;
      scrollContainer.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Wait for scroll to settle
    setTimeout(resolve, 350);
  });
}

export function useTargetElevation(
  selector: string | null,
  active: boolean
): ElevationResult {
  const [result, setResult] = useState<ElevationResult>({ found: false, ready: false, rect: null });
  const currentElRef = useRef<HTMLElement | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const cleanup = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
    if (currentElRef.current) {
      restoreOriginalStyles(currentElRef.current);
      currentElRef.current = null;
    }
    retryCountRef.current = 0;
  }, []);

  useEffect(() => {
    cleanup();

    if (!selector || !active) {
      setResult({ found: false, ready: false, rect: null });
      return cleanup;
    }

    const tryFind = async () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        currentElRef.current = el;
        retryCountRef.current = 0;

        await scrollIntoViewSafely(el);
        applyElevationStyles(el);

        const rect = el.getBoundingClientRect();
        setResult({ found: true, ready: true, rect });
      } else if (retryCountRef.current < 10) {
        retryCountRef.current++;
        retryRef.current = setTimeout(tryFind, 300);
      } else {
        // Max retries exhausted
        setResult({ found: false, ready: true, rect: null });
      }
    };

    tryFind();
    return cleanup;
  }, [selector, active, cleanup]);

  return result;
}

/* ─── Hard cleanup utility ─── */
export function hardCleanupAllOnboarding() {
  // Remove any lingering elevation styles from all onboarding targets
  document.querySelectorAll('[data-onboarding]').forEach((el) => {
    restoreOriginalStyles(el as HTMLElement);
  });
}

/* ─── Step Banner ─── */
interface StepBannerProps {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  actionHint?: string;
  stepType: 'info' | 'action';
  isReady: boolean;
  isLastStep: boolean;
  onGotIt: () => void;
  onSkip: () => void;
}

export function StepBanner({
  step, totalSteps, title, description, actionHint,
  stepType, isReady, isLastStep, onGotIt, onSkip,
}: StepBannerProps) {
  const progress = (step / totalSteps) * 100;
  const buttonLabel = isLastStep ? '🎉 Finish Tour' : 'Got it →';

  return (
    <div
      className="animate-in slide-in-from-top-2 fade-in duration-200"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10001,
        pointerEvents: 'all',
      }}
    >
      {/* Progress bar */}
      <div style={{ height: 3, background: 'hsl(var(--border))' }}>
        <div style={{
          height: '100%', background: 'hsl(var(--primary))',
          width: `${progress}%`, transition: 'width 0.4s ease',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>

      <div style={{
        background: 'hsl(var(--card))',
        borderBottom: '1px solid hsl(var(--border))',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        padding: '10px 16px 12px',
      }}>
        {/* Step counter + skip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'hsl(var(--primary))',
            background: 'hsl(var(--primary) / 0.1)', padding: '2px 10px', borderRadius: 20,
          }}>
            Step {step} of {totalSteps}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            style={{
              fontSize: 12, color: 'hsl(var(--muted-foreground))', background: 'none',
              border: 'none', cursor: 'pointer', padding: '2px 6px',
            }}
          >
            Skip all →
          </button>
        </div>

        {/* Title */}
        <p style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))', margin: '0 0 3px' }}>
          {title}
        </p>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5, margin: 0 }}>
          {description}
        </p>

        {/* Action hint for action steps */}
        {stepType === 'action' && actionHint && (
          <p style={{
            fontSize: 12, color: 'hsl(var(--primary))', fontWeight: 500,
            margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            👆 {actionHint}
          </p>
        )}

        {/* Got it button — only for info steps */}
        {stepType === 'info' && (
          <button
            onClick={(e) => { e.stopPropagation(); onGotIt(); }}
            disabled={!isReady}
            style={{
              marginTop: 8,
              width: '100%',
              height: 36,
              borderRadius: 10,
              background: isReady ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              color: isReady ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: isReady ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}
          >
            {!isReady ? 'Loading...' : buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Fallback Card ─── */
interface FallbackCardProps {
  title: string;
  description: string;
  onGotIt: () => void;
  isLastStep: boolean;
}

export function FallbackCard({ title, description, onGotIt, isLastStep }: FallbackCardProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      pointerEvents: 'all',
    }}>
      <div
        className="animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'hsl(var(--card))',
          borderRadius: 16,
          padding: 24,
          maxWidth: 340,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 8 }}>
          {title}
        </p>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5, marginBottom: 16 }}>
          {description}
        </p>
        <button
          onClick={onGotIt}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 10,
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {isLastStep ? '🎉 Finish Tour' : 'Got it →'}
        </button>
      </div>
    </div>
  );
}

/* ─── Confetti ─── */
export function Confetti() {
  const colors = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[10002] overflow-hidden">
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
