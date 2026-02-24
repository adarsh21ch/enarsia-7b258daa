import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFunnels, useDeleteFunnel, usePublishFunnel } from '@/hooks/useFunnels';
import { FunnelCard } from '@/components/funnels/FunnelCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Video } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { Funnel } from '@/types/funnels';
import { useFunnelFeatureAccess } from '@/hooks/useFunnelFeatureAccess';
import { FunnelsUpgradeDrawer } from '@/components/funnels/FunnelsUpgradeDrawer';
import { FunnelsProBadge } from '@/components/funnels/FunnelsProBadge';

export default function Funnels() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: funnels, isLoading } = useFunnels();
  const deleteFunnel = useDeleteFunnel();
  const publishFunnel = usePublishFunnel();
  const [deleteTarget, setDeleteTarget] = useState<Funnel | null>(null);
  const { canAccess: canCreateFunnel, limit: funnelLimit, isFunnelsPro } = useFunnelFeatureAccess('funnel_create');
  
  const funnelCount = funnels?.length || 0;
  const atLimit = !isFunnelsPro && funnelLimit !== null && funnelCount >= funnelLimit;

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const handleEdit = (funnel: Funnel) => {
    navigate(`/funnels/${funnel.id}/edit`);
  };

  const handlePreview = (funnel: Funnel) => {
    window.open(`/f/${funnel.slug}`, '_blank');
  };

  const handleAnalytics = (funnel: Funnel) => {
    navigate(`/funnels/${funnel.id}/analytics`);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteFunnel.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleTogglePublish = (funnel: Funnel) => {
    publishFunnel.mutate({ id: funnel.id, publish: !funnel.is_published });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Funnels</h1>
            <p className="text-muted-foreground mt-1">
              Create video funnels to capture leads and collect payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isFunnelsPro && <FunnelsProBadge />}
            {atLimit ? (
              <FunnelsUpgradeDrawer triggerText="Upgrade to Create More" />
            ) : (
              <Button onClick={() => navigate('/funnels/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Funnel
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : funnels && funnels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funnels.map((funnel) => (
              <FunnelCard
                key={funnel.id}
                funnel={funnel}
                onEdit={handleEdit}
                onPreview={handlePreview}
                onAnalytics={handleAnalytics}
                onDelete={setDeleteTarget}
                onTogglePublish={handleTogglePublish}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No funnels yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first video funnel to start capturing leads and collecting payments.
            </p>
            <Button onClick={() => navigate('/funnels/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Funnel
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Funnel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone
              and will remove all associated leads and analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
