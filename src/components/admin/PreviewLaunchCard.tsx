import { useState } from 'react';
import { Eye, ChevronRight } from 'lucide-react';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const START_OPTIONS = [
  { value: '0', label: 'Beginning (Step 0 — Welcome screen)' },
  { value: '3', label: 'Step 3 — Lead profile & tagging' },
  { value: '6', label: 'Step 6 — Follow-Up activity' },
  { value: '9', label: 'Step 9 — Tracking numbers' },
  { value: '11', label: 'Completion screen' },
];

export function PreviewLaunchCard() {
  const [open, setOpen] = useState(false);
  const [startStep, setStartStep] = useState('0');
  const { launchPreview } = usePreviewMode();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLaunch = () => {
    if (!user) return;
    launchPreview(user.id, parseInt(startStep));
    setOpen(false);
    navigate('/dashboard');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-indigo-200 p-4 flex items-center justify-between gap-3 transition-all hover:shadow-md active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, hsl(226 100% 97%) 0%, hsl(226 100% 93%) 100%)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold text-indigo-900 truncate">Preview as New User</p>
            <p className="text-[11px] text-indigo-600/80">See exactly what new signups experience</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-indigo-400 shrink-0" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Eye className="h-5 w-5 text-indigo-500" />
              Launch New User Preview
            </SheetTitle>
            <SheetDescription>
              This will open a sandboxed preview of the onboarding experience.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-green-500 mt-0.5">•</span>
              <span>Your real data is safe</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-green-500 mt-0.5">•</span>
              <span>No changes will be saved</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-green-500 mt-0.5">•</span>
              <span>You can exit anytime</span>
            </div>
          </div>

          <p className="text-sm font-semibold mb-2">Start from:</p>
          <RadioGroup value={startStep} onValueChange={setStartStep} className="space-y-2 mb-6">
            {START_OPTIONS.map(opt => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`step-${opt.value}`} />
                <Label htmlFor={`step-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex gap-3">
            <Button onClick={handleLaunch} className="flex-1 rounded-xl">
              Launch Preview →
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
