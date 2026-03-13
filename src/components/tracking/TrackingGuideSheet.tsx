import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Tag, Calculator, Bookmark, ToggleLeft, Lightbulb } from 'lucide-react';

interface TrackingGuideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 rounded-lg bg-muted/60 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
      <span className="font-semibold text-foreground/80">Example: </span>
      {children}
    </div>
  );
}

function GuideSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/50 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start gap-2.5 mb-2">
          <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug pt-1">{title}</h3>
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-2 pl-[38px]">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function TrackingGuideSheet({ open, onOpenChange }: TrackingGuideSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-4 pb-8 overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-base font-bold">How Tracking Works ❓</SheetTitle>
          <p className="text-xs text-muted-foreground">Simple guide to understand your numbers</p>
        </SheetHeader>

        <div className="space-y-3">
          {/* Section 1 */}
          <GuideSection icon={Tag} title="What are Tracking Tags?">
            <p>
              When you add a prospect and set tags like <strong className="text-foreground">"Video Sent"</strong> or{' '}
              <strong className="text-foreground">"Day 2 Done"</strong>, those are tracking tags.
              They tell the app what stage each prospect is at.
            </p>
            <ExampleBox>
              You add <strong>Rohit</strong> → set his tag to <strong>"Video Sent"</strong> → now Rohit counts as
              1 Response and 1 Video Sent.
            </ExampleBox>
          </GuideSection>

          {/* Section 2 */}
          <GuideSection icon={Calculator} title="How are numbers counted automatically?">
            <p>
              The app counts your numbers from the tags you set on your prospects in the{' '}
              <strong className="text-foreground">Calling tab</strong>.
            </p>
            <ul className="space-y-1.5 list-none">
              <li>
                <strong className="text-foreground">Leads</strong> = How many prospects you added
              </li>
              <li>
                <strong className="text-foreground">Responses</strong> = How many have at least one tag set
              </li>
              <li>
                <strong className="text-foreground">Stages</strong> = If someone reaches Stage 3, they automatically
                count for Stage 1 and Stage 2 also
              </li>
            </ul>
            <ExampleBox>
              You have 10 prospects. 6 have tags. 2 reached "Day 3".
              <br />
              Your numbers → Leads: 10, Responses: 6, Day 1: 2, Day 2: 2, Day 3: 2
            </ExampleBox>
          </GuideSection>

          {/* Section 3 */}
          <GuideSection icon={Bookmark} title="What about Personal Tags?">
            <p>
              Personal tags (like <strong className="text-foreground">"Hot Lead"</strong>,{' '}
              <strong className="text-foreground">"Follow Up"</strong>) only count as a{' '}
              <strong className="text-foreground">Response</strong>. They don't affect your stage numbers.
            </p>
            <ExampleBox>
              If you tag someone as "Hot Lead" only, they count as 1 Response — but 0 for any stage like Day 1, Day 2, etc.
            </ExampleBox>
          </GuideSection>

          {/* Section 4 */}
          <GuideSection icon={ToggleLeft} title="Manual vs Automatic Mode">
            <ul className="space-y-1.5 list-none">
              <li>
                <strong className="text-foreground">Automatic</strong> = Numbers come from your prospect tags
                (recommended ✅)
              </li>
              <li>
                <strong className="text-foreground">Manual</strong> = You type numbers yourself each day
              </li>
            </ul>
            <p className="text-[11px] mt-1.5 text-muted-foreground/80">
              You can change this in Settings → Tracking Source.
            </p>
          </GuideSection>

          {/* Section 5 */}
          <GuideSection icon={Lightbulb} title="Tips to get accurate numbers">
            <ul className="space-y-1.5 list-none">
              <li>✅ Always update tags when something changes</li>
              <li>✅ Use the correct stage tag, not just personal tags</li>
              <li>✅ Don't skip stages — but if you do, the app handles it</li>
              <li>⚠️ Numbers update when you change tags in the Calling tab</li>
            </ul>
          </GuideSection>
        </div>
      </SheetContent>
    </Sheet>
  );
}
