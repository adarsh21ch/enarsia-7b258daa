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
      {/* Progress bar at very top */}
      <div style={{ height: 3, background: '#e5e7eb' }}>
        <div style={{
          height: '100%', background: '#2563EB',
          width: `${progress}%`, transition: 'width 0.4s ease',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>

      <div style={{
        background: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        padding: '12px 16px 14px',
      }}>
        {/* Step counter + skip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#2563EB',
            background: '#EFF6FF', padding: '3px 10px', borderRadius: 20,
          }}>
            Step {step} of {totalSteps}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            style={{
              fontSize: 12, color: '#999', background: 'none',
              border: 'none', cursor: 'pointer', padding: '2px 6px',
            }}
          >
            Skip →
          </button>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{title}</span>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.55, margin: '0 0 4px 0' }}>
          {description}
        </p>

        {/* Action hint */}
        {actionHint && (
          <p style={{
            fontSize: 12, color: '#2563EB', fontWeight: 500,
            margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            👆 {actionHint}
          </p>
        )}

        {/* Got it button */}
        <button
          onClick={(e) => { e.stopPropagation(); onGotIt(); }}
          style={{
            marginTop: 10,
            width: '100%',
            height: 38,
            borderRadius: 10,
            background: '#2563EB',
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
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
