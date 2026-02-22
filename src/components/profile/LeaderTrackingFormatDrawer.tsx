import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sliders, ChevronRight, Users } from 'lucide-react';
import { LeaderTrackingFormatSettings } from './LeaderTrackingFormatSettings';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';

interface LeaderTrackingFormatDrawerProps {
  profile: Profile | null;
  updating: boolean;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<{ error: any }>;
  onUpdateUplineByEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  onClearLeaderHierarchy: () => Promise<{ success: boolean; error?: string }>;
}

export function LeaderTrackingFormatDrawer({
  profile,
  updating,
  onUpdateProfile,
  onUpdateUplineByEmail,
  onClearLeaderHierarchy
}: LeaderTrackingFormatDrawerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const TriggerButton = (
    <button className="w-full rounded-xl px-4 py-2 bg-card border border-border/50 flex items-center justify-between transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2.5">
        <Sliders className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Tracking Format</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );

  const Content = (
    <ScrollArea className="h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]">
      <div className="px-4 pb-8">
        <LeaderTrackingFormatSettings
          profile={profile}
          updating={updating}
          onUpdateProfile={onUpdateProfile}
          onUpdateUplineByEmail={onUpdateUplineByEmail}
          onClearLeaderHierarchy={onClearLeaderHierarchy}
        />
      </div>
    </ScrollArea>
  );

  // Mobile: Bottom drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b border-border/50 pb-4">
            <DrawerTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Upline Tracking Format
            </DrawerTitle>
          </DrawerHeader>
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Right-side sheet
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {TriggerButton}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 py-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Upline Tracking Format
          </SheetTitle>
        </SheetHeader>
        {Content}
      </SheetContent>
    </Sheet>
  );
}
