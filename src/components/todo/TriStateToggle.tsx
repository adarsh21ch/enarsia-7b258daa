import { cn } from '@/lib/utils';

type TriState = 'yes' | 'no' | null;

interface TriStateToggleProps {
  value: TriState;
  onChange: (next: TriState) => void;
  className?: string;
}

/**
 * iOS-style 3-state switch: No (left, red) — Unset (center, grey) — Yes (right, green).
 * One tap on a half sets that side instantly; tap the active side again to unset.
 * No drag required. Each half is a full-height ≥44px tap target.
 */
export function TriStateToggle({ value, onChange, className }: TriStateToggleProps) {
  // Track 56×30, knob 18 (60% of track). Positions: 3 / 19 / 35.
  const knobLeft = value === 'no' ? 3 : value === 'yes' ? 35 : 19;
  const trackColor =
    value === 'yes'
      ? 'bg-[#1DAA8B]'
      : value === 'no'
      ? 'bg-[#EF4444]'
      : 'bg-[#E5E7EB] dark:bg-muted/60';

  const handleLeft = () => onChange(value === 'no' ? null : 'no');
  const handleRight = () => onChange(value === 'yes' ? null : 'yes');

  return (
    <div
      role="radiogroup"
      aria-label="Mark task: No, Unset, or Yes"
      className={cn(
        'relative inline-flex h-11 w-14 shrink-0 items-center justify-center',
        className,
      )}
    >
      {/* Track */}
      <div
        className={cn(
          'pointer-events-none relative h-[30px] w-14 rounded-full transition-colors duration-150 ease-out',
          trackColor,
        )}
      >
        {/* Knob */}
        <div
          className="absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.1)] transition-[left] duration-150 ease-out"
          style={{ left: knobLeft }}
        />
      </div>

      {/* Two full-height tap zones overlayed */}
      <button
        type="button"
        role="radio"
        aria-checked={value === 'no'}
        aria-label="No"
        onClick={handleLeft}
        className="absolute inset-y-0 left-0 w-1/2 rounded-l-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
      />
      <button
        type="button"
        role="radio"
        aria-checked={value === 'yes'}
        aria-label="Yes"
        onClick={handleRight}
        className="absolute inset-y-0 right-0 w-1/2 rounded-r-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
      />
    </div>
  );
}
