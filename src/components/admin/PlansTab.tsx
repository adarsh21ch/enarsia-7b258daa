import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlansManager } from './PlansManager';
import { OffersManager } from './OffersManager';

/**
 * Top-level Plans section in admin: pricing, intro offers, and promo offers
 * all live here. Revenue analytics stays in the Revenue tab.
 */
export function PlansTab() {
  return (
    <Tabs defaultValue="plans" className="w-full">
      <TabsList className="w-full grid grid-cols-2 h-9">
        <TabsTrigger value="plans" className="text-xs h-7">💎 Plans</TabsTrigger>
        <TabsTrigger value="offers" className="text-xs h-7">🏷️ Offers</TabsTrigger>
      </TabsList>
      <TabsContent value="plans" className="mt-3">
        <PlansManager />
      </TabsContent>
      <TabsContent value="offers" className="mt-3">
        <OffersManager />
      </TabsContent>
    </Tabs>
  );
}
