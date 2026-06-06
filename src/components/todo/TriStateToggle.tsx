import { cn } from '@/lib/utils';

type TriState = 'yes' | 'no' | null;

interface TriStateToggleProps {
  value: TriState;
  onChange: (next: TriState) => void;
  className?: string;
}

/**
 * 3-state sliding toggle: No (left, red) — Unset (center, grey) — Yes (right, green).
 * Tap a side to set it; tap the active side again to return to unset.
 * Knob animates between positions. Min 44px tap target.
 */
export function TriStateToggle({ value, onChange, className }: TriStateToggleProps) {
  const pos = value === 'no' ? 0 : value === 'yes' ? 2 : 1;
  const knobColor =
    value === 'yes'
      ? 'bg-[#1DAA8B]'
      : value === 'no'
      ? 'bg-red-500'
      : 'bg-muted-foreground/50';

  // Track: 96 wide × 44 tall. Knob 36 × 36. Positions: 4 / 30 / 56.
  const knobLeft = pos === 0 ? 4 : pos === 1 ? 30 : 56;

  return (
    <div
      role="radiogroup"
      aria-label="Mark task: No, Unset, or Yes"
      className={cn(
        'relative h-11 w-24 shrink-0 rounded-full bg-muted/60 dark:bg-muted/40 border border-border/40',
        className,
      )}
    >
      {/* Side labels */}
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-red-500/60">
        No
      </span>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase text-[#1DAA8B]/70">
        Yes
      </span>

      {/* Sliding knob */}
      <div
        className={cn(
          'absolute top-1 h-9 w-9 rounded-full shadow-md transition-all duration-200 ease-out',
          knobColor,
        )}
        style={{ left: knobLeft }}
      />

      {/* 3 invisible tap zones */}
      <div className="relative grid h-full grid-cols-3">
        <button
          type="button"
          role="radio"
          aria-checked={value === 'no'}
          aria-label="No"
          onClick={() => onChange(value === 'no' ? null : 'no')}
          className="h-full rounded-l-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          aria-label="Unset"
          onClick={() => onChange(null)}
          className="h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          role="radio"
          aria-checked={value === 'yes'}
          aria-label="Yes"
          onClick={() => onChange(value === 'yes' ? null : 'yes')}
          className="h-full rounded-r-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}
