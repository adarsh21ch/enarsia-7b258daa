import { ReactNode, useEffect, useState, useRef } from 'react';

/* ─── Blue Highlight Box (no overlay, user can interact freely) ─── */
export function HighlightBox({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) return null;

  const pad = 6;
  return (
    <div
      style={{
        position: 'fixed',
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
        borderRadius: 12,
        border: '2.5px solid #2563EB',
        boxShadow: '0 0 0 4px rgba(37,99,235,0.18), 0 0 24px 4px rgba(37,99,235,0.10)',
        zIndex: 9998,
        pointerEvents: 'none',
        transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* Pulsing corners for attention */}
      <div style={{
        position: 'absolute', inset: -3, borderRadius: 14,
        border: '2px solid rgba(37,99,235,0.35)',
        animation: 'onb-pulse 1.8s ease-in-out infinite',
      }} />
    </div>
  );
}

/* ─── Subtle dimming (very light, doesn't block interaction) ─── */
export function LightDimOverlay({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) return null;

  // Use a CSS clip-path to cut out the target area
  const pad = 8;
  const t = targetRect.top - pad;
  const l = targetRect.left - pad;
  const w = targetRect.width + pad * 2;
  const h = targetRect.height + pad * 2;
  const r = 12;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.25)',
        zIndex: 9000,
        pointerEvents: 'none',
        transition: 'all 0.25s ease',
        clipPath: `polygon(
          0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
          ${l}px ${t + r}px,
          ${l + r}px ${t}px,
          ${l + w - r}px ${t}px,
          ${l + w}px ${t + r}px,
          ${l + w}px ${t + h - r}px,
          ${l + w - r}px ${t + h}px,
          ${l + r}px ${t + h}px,
          ${l}px ${t + h - r}px,
          ${l}px ${t + r}px
        )`,
      }}
    />
  );
}

/* ─── Target Highlighter Hook ─── */
export function useTargetHighlight(selector: string | null, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector || !active) {
      setRect(null);
      return;
    }

    const update = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
        // Scroll into view if needed
        if (r.top < 80 || r.bottom > window.innerHeight - 20) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        setRect(null);
      }
    };

    update();
    const interval = setInterval(update, 500);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [selector, active]);

  return rect;
}

/* ─── Top Tooltip Banner ─── */
interface TopTooltipProps {
  step: number;
  totalSteps: number;
  icon: ReactNode;
  title: string;
  description: string;
  actionHint?: string;
  onGotIt: () => void;
  onSkip: () => void;
  isLastStep?: boolean;
}

export function TopTooltipBanner({
  step, totalSteps, icon, title, description, actionHint,
  onGotIt, onSkip, isLastStep,
}: TopTooltipProps) {
  const progress = (step / totalSteps) * 100;
  const buttonLabel = isLastStep ? '🎉 Finish Tour' : 'Got it →';

  return (
    <div
      className="animate-in slide-in-from-top-2 fade-in duration-200 fixed top-0 left-0 right-0 z-[10001] pointer-events-auto"
    >
      {/* Progress bar at very top */}
      <div className="h-[3px] bg-border">
        <div
          className="h-full bg-primary rounded-r-sm transition-[width] duration-[400ms]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bg-card text-card-foreground border-b border-border/50 shadow-md px-4 pt-3 pb-3.5">
        {/* Step counter + skip */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-[3px] rounded-full">
            Step {step} of {totalSteps}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="text-xs text-muted-foreground bg-transparent border-0 cursor-pointer px-1.5 py-0.5"
          >
            Skip →
          </button>
        </div>

        {/* Title row */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{icon}</span>
          <span className="text-[15px] font-semibold text-foreground">{title}</span>
        </div>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground leading-snug m-0 mb-1">
          {description}
        </p>

        {/* Action hint */}
        {actionHint && (
          <p className="text-xs text-primary font-medium mt-0.5 flex items-center gap-1">
            👆 {actionHint}
          </p>
        )}

        {/* Got it button */}
        <button
          onClick={(e) => { e.stopPropagation(); onGotIt(); }}
          className="mt-2.5 w-full h-[38px] rounded-[10px] bg-primary text-primary-foreground font-semibold text-sm border-0 cursor-pointer flex items-center justify-center gap-1.5"
        >
          {buttonLabel}
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
