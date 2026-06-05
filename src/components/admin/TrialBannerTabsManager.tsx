import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const ALL_TABS = [
  { id: 'dashboard', label: 'Calling (Dashboard)', description: 'Main calling/prospects page' },
  { id: 'listup', label: 'Follow-Up (ListUp)', description: 'Follow-up prospects view' },
  { id: 'profile', label: 'Profile', description: 'User profile page' },
  { id: 'todoup', label: 'To-Do', description: 'Todo tasks page' },
  { id: 'tracking', label: 'Tracking', description: 'Tracking analytics page' },
];

export function TrialBannerTabsManager() {
  const queryClient = useQueryClient();
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current config
  const { data: config, isLoading } = useQuery({
    queryKey: ['trial-banner-tabs-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_config_text')
        .select('*')
        .eq('config_key', 'trial_banner_tabs')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Initialize selected tabs from config
  useEffect(() => {
    if (config?.config_value) {
      const tabs = config.config_value.split(',').map((t: string) => t.trim().toLowerCase());
      setSelectedTabs(tabs);
    }
  }, [config]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (tabs: string[]) => {
      const { error } = await supabase
        .from('admin_config_text')
        .update({ 
          config_value: tabs.join(','),
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'trial_banner_tabs');
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trial banner visibility updated');
      queryClient.invalidateQueries({ queryKey: ['trial-banner-tabs-admin'] });
      queryClient.invalidateQueries({ queryKey: ['trial-banner-tabs'] });
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const handleToggle = (tabId: string) => {
    setSelectedTabs(prev => {
      const newTabs = prev.includes(tabId)
        ? prev.filter(t => t !== tabId)
        : [...prev, tabId];
      setHasChanges(true);
      return newTabs;
    });
  };

  const handleSave = () => {
    updateMutation.mutate(selectedTabs);
  };

  const handleSelectAll = () => {
    setSelectedTabs(ALL_TABS.map(t => t.id));
    setHasChanges(true);
  };

  const handleSelectNone = () => {
    setSelectedTabs([]);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Trial Banner Visibility
        </CardTitle>
        <CardDescription className="text-xs">
          Select which tabs should display the trial countdown banner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Show All
          </Button>
          <Button variant="outline" size="sm" onClick={handleSelectNone} className="text-xs">
            <EyeOff className="h-3 w-3 mr-1" />
            Hide All
          </Button>
        </div>

        {/* Tab checkboxes */}
        <div className="space-y-3">
          {ALL_TABS.map((tab) => (
            <div key={tab.id} className="flex items-start gap-3">
              <Checkbox
                id={`tab-${tab.id}`}
                checked={selectedTabs.includes(tab.id)}
                onCheckedChange={() => handleToggle(tab.id)}
              />
              <div className="grid gap-0.5 leading-none">
                <Label
                  htmlFor={`tab-${tab.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {tab.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {tab.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Save button */}
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            className="w-full"
            size="sm"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}