import { useMemo, useState } from 'react';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Prospect } from '@/types/prospect';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface CurrentLeadStatusProps {
  kpiTotal?: number;
  kpiTagCounts?: Record<string, number>;
  prospects: Prospect[];
  onSelectProspect?: (prospect: Prospect) => void;
}

interface KPIItem {
  label: string;
  value: number;
  isStar?: boolean;
  filterKey: string; // e.g. "action:Video Sent"
}

export function CurrentLeadStatus({ kpiTotal, kpiTagCounts, prospects, onSelectProspect }: CurrentLeadStatusProps) {
  const isMobile = useIsMobile();
  const { leadsTrackingTagNames, leadsStageTag } = useTrackingFormatContext();
  const [selectedCard, setSelectedCard] = useState<KPIItem | null>(null);

  // Build KPI items: Leads, Responses, then user tags
  const kpiItems = useMemo<KPIItem[]>(() => {
    const total = kpiTotal ?? prospects.length;
    
    // Count responses (prospects with any action_taken)
    const responseCount = kpiTagCounts
      ? Object.entries(kpiTagCounts)
          .filter(([k]) => k.startsWith('action:'))
          .reduce((sum, [, v]) => sum + v, 0)
      : prospects.filter(p => p.action_taken).length;

    const items: KPIItem[] = [
      { label: 'Leads', value: total, filterKey: '__all__' },
      { label: 'Responses', value: responseCount, filterKey: '__responses__' },
    ];

    leadsTrackingTagNames.forEach(tag => {
      const count = kpiTagCounts?.[`action:${tag}`] ?? prospects.filter(p => p.action_taken === tag).length;
      items.push({
        label: tag,
        value: count,
        isStar: tag === leadsStageTag,
        filterKey: `action:${tag}`,
      });
    });

    return items;
  }, [kpiTotal, kpiTagCounts, prospects, leadsTrackingTagNames, leadsStageTag]);

  // Filtered prospects for the selected card
  const filteredProspects = useMemo(() => {
    if (!selectedCard) return [];
    const key = selectedCard.filterKey;
    if (key === '__all__') return prospects;
    if (key === '__responses__') return prospects.filter(p => p.action_taken);
    const tag = key.replace('action:', '');
    return prospects.filter(p => p.action_taken === tag);
  }, [selectedCard, prospects]);

  const handleCardClick = (item: KPIItem) => {
    setSelectedCard(item);
  };

  const panelContent = selectedCard && (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-1">
        {filteredProspects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No prospects found</p>
        ) : (
          filteredProspects.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectProspect?.(p)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium text-foreground truncate">{p.name || 'Unnamed'}</p>
              {p.action_taken && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{p.action_taken}</p>
              )}
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );

  const panelTitle = selectedCard ? `${selectedCard.label} – ${selectedCard.value} Prospects` : '';

  return (
    <div className="mt-4">
      <div className="mb-2">
        <p className="text-xs font-semibold text-foreground">Current Lead Status</p>
        <p className="text-[10px] text-muted-foreground">Prospects in each stage right now</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpiItems.map(item => (
          <button
            key={item.filterKey}
            onClick={() => handleCardClick(item)}
            className={cn(
              "rounded-xl border border-border/50 bg-card p-3 text-center transition-all",
              "hover:border-primary/30 hover:shadow-sm active:scale-[0.98]",
              selectedCard?.filterKey === item.filterKey && "border-primary/50 ring-1 ring-primary/20"
            )}
          >
            <div className="flex items-center justify-center gap-1">
              {item.isStar && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
              <span className="text-xl font-bold text-foreground">{item.value}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1 truncate">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Desktop: Side sheet */}
      {!isMobile && (
        <Sheet open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
          <SheetContent side="right" className="w-[340px] sm:w-[380px] p-0">
            <SheetHeader className="px-4 py-3 border-b border-border/50">
              <SheetTitle className="text-sm font-semibold">{panelTitle}</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100%-56px)]">
              {panelContent}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile: Bottom drawer */}
      {isMobile && (
        <Drawer open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
          <DrawerContent className="max-h-[70vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-sm font-semibold">{panelTitle}</DrawerTitle>
            </DrawerHeader>
            <div className="px-2 pb-4 overflow-y-auto max-h-[55vh]">
              {panelContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
