import { Loader2, ListOrdered } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PlanSequenceControlProps {
  position: number;
  total: number;
  disabled?: boolean;
  onChange: (nextPosition: number) => void;
}

export function PlanSequenceControl({
  position,
  total,
  disabled,
  onChange,
}: PlanSequenceControlProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <ListOrdered className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Sequence</span>
      </div>

      <Select
        value={String(position)}
        disabled={disabled || total <= 1}
        onValueChange={(value) => {
          const nextPosition = Number(value);
          if (nextPosition !== position) onChange(nextPosition);
        }}
      >
        <SelectTrigger className="h-8 min-w-[104px] border-border/60 bg-background text-xs">
          <SelectValue placeholder={`#${position} of ${total}`} />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: total }, (_, index) => {
            const slot = index + 1;

            return (
              <SelectItem key={slot} value={String(slot)} className="text-xs">
                #{slot} of {total}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}