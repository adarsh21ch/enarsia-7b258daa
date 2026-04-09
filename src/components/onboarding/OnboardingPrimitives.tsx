import { ReactNode, useEffect, useState, useRef } from 'react';

/* ─── 4-Panel Overlay ─── */
interface FourPanelOverlayProps {
  targetRect: DOMRect | null;
}

export function FourPanelOverlay({ targetRect }: FourPanelOverlayProps) {
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    background: 'rgba(0,0,0,0.55)',
    zIndex: 9000,
    pointerEvents: 'all',
    transition: 'all 0.2s ease',
  };

  // If no target found, show full-screen overlay with no cutout
  if (!targetRect) {
    return <div style={{ ...panelStyle, top: 0, left: 0, width: '100vw', height: '100vh' }} />;
  }

  const pad = 8;
  const t = targetRect.top - pad;
  const l = targetRect.left - pad;
  const w = targetRect.width + pad * 2;
  const h = targetRect.height + pad * 2;

  return (
    <>
      <div style={{ ...panelStyle, top: 0, left: 0, width: '100vw', height: Math.max(0, t) }} />
      <div style={{ ...panelStyle, top: t + h, left: 0, width: '100vw', height: `calc(100vh - ${t + h}px)` }} />
      <div style={{ ...panelStyle, top: t, left: 0, width: Math.max(0, l), height: h }} />
      <div style={{ ...panelStyle, top: t, left: l + w, width: `calc(100vw - ${l + w}px)`, height: h }} />
    </>
  );
}

/* ─── Target Highlighter ─── */
export function useTargetHighlight(selector: string | null, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const prevElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selector || !active) {
      if (prevElRef.current) {
        prevElRef.current.style.removeProperty('position');
        prevElRef.current.style.removeProperty('z-index');
        prevElRef.current.style.removeProperty('pointer-events');
        prevElRef.current.style.removeProperty('box-shadow');
        prevElRef.current.style.removeProperty('border-radius');
        prevElRef.current = null;
      }
      setRect(null);
      return;
    }

    const update = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        if (prevElRef.current && prevElRef.current !== el) {
          prevElRef.current.style.removeProperty('position');
          prevElRef.current.style.removeProperty('z-index');
          prevElRef.current.style.removeProperty('pointer-events');
          prevElRef.current.style.removeProperty('box-shadow');
          prevElRef.current.style.removeProperty('border-radius');
        }
        el.style.position = 'relative';
        el.style.zIndex = '9999';
        el.style.pointerEvents = 'all';
        el.style.boxShadow = '0 0 0 3px #2563EB, 0 0 0 8px rgba(37,99,235,0.25)';
        el.style.borderRadius = '10px';
        prevElRef.current = el;

        const r = el.getBoundingClientRect();
        setRect(r);

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
      if (prevElRef.current) {
        prevElRef.current.style.removeProperty('position');
        prevElRef.current.style.removeProperty('z-index');
        prevElRef.current.style.removeProperty('pointer-events');
        prevElRef.current.style.removeProperty('box-shadow');
        prevElRef.current.style.removeProperty('border-radius');
        prevElRef.current = null;
      }
    };
  }, [selector, active]);

  return rect;
}

/* ─── Tooltip Card ─── */
interface TooltipCardProps {
  targetRect: DOMRect | null;
  step: number;
  totalSteps: number;
  icon: ReactNode;
  title: string;
  description: string;
  onGotIt: () => void;
  onSkip: () => void;
  gotItLabel?: string;
  skipLabel?: string;
  isLastStep?: boolean;
}

export function OnboardingTooltip({
  targetRect, step, totalSteps, icon, title, description,
  onGotIt, onSkip, gotItLabel, skipLabel, isLastStep,
}: TooltipCardProps) {
  const progress = (step / totalSteps) * 100;
  const buttonLabel = isLastStep ? 'Finish Tour →' : (gotItLabel || 'Got it →');

  // Calculate position
  let posStyle: React.CSSProperties;
  if (targetRect) {
    const vh = window.innerHeight;
    const above = targetRect.bottom > vh * 0.6;
    const targetCenter = targetRect.left + targetRect.width / 2;
    const left = Math.max(12, Math.min(targetCenter - 160, window.innerWidth - 332));
    if (above) {
      posStyle = { bottom: `${vh - targetRect.top + 20}px`, left };
    } else {
      posStyle = { top: targetRect.bottom + 20, left };
    }
  } else {
    // Fallback: center on screen
    posStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  return (
    <div
      className="animate-in fade-in duration-150"
      style={{
        position: 'fixed',
        zIndex: 10000,
        pointerEvents: 'all',
        maxWidth: 320,
        width: 320,
        ...posStyle,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 14,
          padding: '16px 18px',
          border: '0.5px solid rgba(0,0,0,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
      >
        <div className="space-y-1.5 mb-3">
          <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>Step {step} of {totalSteps}</span>
          <div style={{ height: 3, borderRadius: 2, background: '#eee', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#2563EB', width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{title}</span>
        </div>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>{description}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onGotIt(); }}
          style={{
            width: '100%', height: 40, borderRadius: 10, background: '#2563EB',
            color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {buttonLabel}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          style={{
            marginTop: 8, fontSize: 12, color: '#999', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          {skipLabel || 'Skip this step'}
        </button>
      </div>
    </div>
  );
}

/* ─── Step Pill ─── */
export function StepPill({ step, total }: { step: number; total: number }) {
  return (
    <div style={{
      position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10001, background: '#2563EB', color: 'white',
      fontSize: 11, fontWeight: 700, padding: '4px 12px',
      borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      Step {step} / {total}
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
