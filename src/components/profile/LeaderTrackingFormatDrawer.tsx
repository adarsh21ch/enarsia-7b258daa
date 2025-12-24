import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, ChevronRight } from 'lucide-react';
import { LeaderTrackingFormatSettings } from './LeaderTrackingFormatSettings';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';

interface LeaderTrackingFormatDrawerProps {
  profile: Profile | null;
  updating: boolean;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<{ error: any }>;
  onUpdateLeaderHierarchy: (leaderId: string) => Promise<{ success: boolean; error?: string }>;
  onClearLeaderHierarchy: () => Promise<{ success: boolean; error?: string }>;
}

export function LeaderTrackingFormatDrawer({
  profile,
  updating,
  onUpdateProfile,
  onUpdateLeaderHierarchy,
  onClearLeaderHierarchy
}: LeaderTrackingFormatDrawerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const TriggerButton = (
    <button className="w-full relative overflow-hidden rounded-xl p-4 bg-gradient-to-r from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/20 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="text-left">
          <span className="font-medium block">Leader Tracking Format</span>
          <span className="text-xs text-muted-foreground">Tags, levels & funnel settings</span>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );

  const Content = (
    <ScrollArea className="h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]">
      <div className="px-4 pb-8">
        <LeaderTrackingFormatSettings
          profile={profile}
          updating={updating}
          onUpdateProfile={onUpdateProfile}
          onUpdateLeaderHierarchy={onUpdateLeaderHierarchy}
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
              Leader Tracking Format
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
            Leader Tracking Format
          </SheetTitle>
        </SheetHeader>
        {Content}
      </SheetContent>
    </Sheet>
  );
}
