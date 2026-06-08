import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { UsageLimitsManager } from './UsageLimitsManager';
import { FeatureFlagsManager } from './FeatureFlagsManager';
import { AuditLogViewer } from './AuditLogViewer';
import { AdminDataRecovery } from './AdminDataRecovery';
import { BrandingManager } from './BrandingManager';
import { AcademyManager } from './AcademyManager';
import { DemoLeadsManager } from './DemoLeadsManager';

export function ManageTab() {
  return (
    <Tabs defaultValue="limits" className="w-full">
      <ScrollArea className="w-full">
        <TabsList className="inline-flex w-max gap-0.5 h-9">
          <TabsTrigger value="limits" className="text-[11px] px-3 h-7">⚙️ Limits</TabsTrigger>
          <TabsTrigger value="features" className="text-[11px] px-3 h-7">✨ Features</TabsTrigger>
          <TabsTrigger value="branding" className="text-[11px] px-3 h-7">🎨 Branding</TabsTrigger>
          <TabsTrigger value="academy" className="text-[11px] px-3 h-7">🎓 Academy</TabsTrigger>
          <TabsTrigger value="demo" className="text-[11px] px-3 h-7">🎁 Demo</TabsTrigger>
          <TabsTrigger value="audit" className="text-[11px] px-3 h-7">📋 Audit</TabsTrigger>
          <TabsTrigger value="recovery" className="text-[11px] px-3 h-7">💾 Recovery</TabsTrigger>
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <TabsContent value="limits" className="mt-3">
        <UsageLimitsManager />
      </TabsContent>
      <TabsContent value="features" className="mt-3">
        <FeatureFlagsManager />
      </TabsContent>
      <TabsContent value="branding" className="mt-3">
        <BrandingManager />
      </TabsContent>
      <TabsContent value="academy" className="mt-3">
        <AcademyManager />
      </TabsContent>
      <TabsContent value="demo" className="mt-3">
        <DemoLeadsManager />
      </TabsContent>
      <TabsContent value="audit" className="mt-3">
        <AuditLogViewer />
      </TabsContent>
      <TabsContent value="recovery" className="mt-3">
        <AdminDataRecovery />
      </TabsContent>
    </Tabs>
  );
}
