import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { HelpCircle, ChevronRight, Loader2, CheckCircle2, Bug, GraduationCap, CreditCard, MessageSquare, Mail, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupportTickets, TicketCategory } from '@/hooks/useSupportTickets';

const CATEGORY_OPTIONS: { value: TicketCategory; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'app_issue', label: 'App Issue', icon: Bug, description: 'Report bugs or technical problems' },
  { value: 'training_help', label: 'Training / Business Help', icon: GraduationCap, description: 'Get help with using the app' },
  { value: 'payment', label: 'Payment / Subscription', icon: CreditCard, description: 'Billing or subscription issues' },
  { value: 'other', label: 'Other Query', icon: MessageSquare, description: 'General questions or feedback' },
];

export function HelpSupportDrawer() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'category' | 'form' | 'success'>('category');
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  
  const { createTicket, isCreating } = useSupportTickets();

  const resetForm = () => {
    setStep('category');
    setCategory(null);
    setSubject('');
    setDescription('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(resetForm, 300);
    }
  };

  const handleCategorySelect = (value: TicketCategory) => {
    setCategory(value);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject.trim() || !description.trim()) return;

    try {
      await createTicket({
        category,
        subject: subject.trim(),
        description: description.trim(),
      });
      setStep('success');
    } catch {
      // Error handled in hook
    }
  };

  const handleDone = () => {
    setOpen(false);
    setTimeout(resetForm, 300);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <button className="w-full rounded-xl px-4 py-2 bg-card border border-border/50 flex items-center justify-between transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Help & Support</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DrawerTrigger>

      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            {step === 'form' && (
              <button onClick={() => setStep('category')} className="p-1 -ml-1 rounded hover:bg-muted/50">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <HelpCircle className="h-5 w-5 text-primary" />
            Help & Support
          </DrawerTitle>
          <DrawerDescription>
            {step === 'category' && 'How can we help you?'}
            {step === 'form' && 'Describe your issue or question'}
            {step === 'success' && 'Request submitted successfully'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-8 overflow-y-auto">
          {step === 'category' && (
            <div className="space-y-3">
              {/* Contact email - quick access */}
              <a
                href="mailto:teamnevorai@gmail.com"
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-primary/20",
                  "flex items-center gap-3 text-left",
                  "transition-all hover:bg-primary/5"
                )}
              >
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Email Us</p>
                  <p className="text-[11px] text-primary">teamnevorai@gmail.com</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </a>

              <p className="text-xs text-muted-foreground font-medium px-1 pt-1">Or raise a support ticket:</p>

              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleCategorySelect(option.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border border-border/50",
                    "flex items-center gap-3 text-left",
                    "transition-all hover:bg-muted/50 hover:border-primary/30"
                  )}
                >
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <option.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-[11px] text-muted-foreground">{option.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                {CATEGORY_OPTIONS.find(c => c.value === category)?.icon && (
                  <span className="text-primary">
                    {(() => {
                      const Icon = CATEGORY_OPTIONS.find(c => c.value === category)?.icon;
                      return Icon ? <Icon className="h-4 w-4" /> : null;
                    })()}
                  </span>
                )}
                <span className="text-sm font-medium">
                  {CATEGORY_OPTIONS.find(c => c.value === category)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => setStep('category')}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe your issue or question in detail..."
                  rows={5}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isCreating || !subject.trim() || !description.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Request Submitted</h3>
                <p className="text-muted-foreground mt-1">
                  Your request has been submitted. Our team will review it shortly.
                </p>
              </div>
              <Button onClick={handleDone} className="mt-4">
                Done
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
