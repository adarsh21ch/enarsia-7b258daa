import { ReactNode, useEffect, useState, useRef, useCallback } from 'react';

/** Dark overlay with a transparent hole cutout around a target element */
export function SpotlightOverlay({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) return null;
  
  const pad = 8;
  const top = targetRect.top - pad;
  const left = targetRect.left - pad;
  const width = targetRect.width + pad * 2;
  const height = targetRect.height + pad * 2;
  const radius = 14;

  return (
    <div className="fixed inset-0 z-[300] pointer-events-auto">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={left} y={top} width={width} height={height}
              rx={radius} ry={radius} fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.52)"
          mask="url(#spotlight-mask)"
        />
      </svg>
      {/* Pulsing ring around cutout - pointer-events-none so clicks pass through */}
      <div
        className="absolute pointer-events-none"
        style={{
          top, left, width, height,
          borderRadius: radius,
          boxShadow: '0 0 0 3px #2563EB',
          animation: 'onboarding-pulse-ring 1.5s ease-in-out infinite',
        }}
      />
      {/* Clickable hole - allow interactions with target */}
      <div
        className="absolute pointer-events-none"
        style={{ top, left, width, height, borderRadius: radius }}
      />
    </div>
  );
}

/** Floating tooltip card */
interface TooltipCardProps {
  targetRect: DOMRect | null;
  step: number;
  totalSteps: number;
  emoji: string;
  title: string;
  description: string;
  onSkip: () => void;
  skipLabel?: string;
}

export function OnboardingTooltip({
  targetRect, step, totalSteps, emoji, title, description, onSkip, skipLabel = 'Skip this step →'
}: TooltipCardProps) {
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean }>({ top: 0, left: 0, above: false });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetRect) return;
    const vh = window.innerHeight;
    const pad = 12;
    const targetCenter = targetRect.left + targetRect.width / 2;
    const above = targetRect.top > vh * 0.4;
    
    let left = Math.max(16, Math.min(targetCenter - 145, window.innerWidth - 306));
    let top: number;
    
    if (above) {
      top = targetRect.top - pad - 8;
    } else {
      top = targetRect.bottom + pad + 8;
    }
    
    setPos({ top, left, above });
  }, [targetRect]);

  if (!targetRect) return null;

  const progress = (step / totalSteps) * 100;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[302] animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{
        top: pos.above ? undefined : pos.top,
        bottom: pos.above ? `${window.innerHeight - pos.top}px` : undefined,
        left: pos.left,
        maxWidth: 290,
        width: 290,
      }}
    >
      <div
        className="bg-white rounded-[14px] p-4 space-y-2.5"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
      >
        {/* Row 1: Step counter + progress bar */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-gray-400 font-medium">Step {step} of {totalSteps}</span>
          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {/* Row 2: Emoji + Title */}
        <div className="flex items-center gap-2">
          <span className="text-[22px] leading-none">{emoji}</span>
          <span className="text-sm font-bold text-[#111]">{title}</span>
        </div>
        {/* Row 3: Description */}
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        {/* Row 4: Skip */}
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          {skipLabel}
        </button>
      </div>
    </div>
  );
}

/** Step indicator pill at top of screen */
export function StepPill({ step, total }: { step: number; total: number }) {
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[305] bg-[#2563EB] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg">
      Step {step} / {total}
    </div>
  );
}

/** CSS confetti for completion */
export function Confetti() {
  const colors = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[310] overflow-hidden">
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

/** Hook to track a DOM element's position */
export function useTargetRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) { setRect(null); return; }

    const update = () => {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
        // Auto-scroll into view if needed
        if (r.top < 0 || r.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        setRect(null);
      }
    };

    update();
    const interval = setInterval(update, 400);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [selector]);

  return rect;
}
