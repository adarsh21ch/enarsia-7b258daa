import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { UpdateFormInput } from '../types';

interface Props {
  settings: UpdateFormInput;
  onChange: (settings: UpdateFormInput) => void;
}

export function FormSettingsPanel({ settings, onChange }: Props) {
  const update = (partial: Partial<UpdateFormInput>) => onChange({ ...settings, ...partial });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Confirmation Message</Label>
        <Textarea
          value={settings.confirmation_message || ''}
          onChange={e => update({ confirmation_message: e.target.value })}
          placeholder="Thank you for your submission!"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Accepting Responses</Label>
          <p className="text-xs text-muted-foreground">Toggle off to close the form</p>
        </div>
        <Switch checked={settings.is_accepting ?? true} onCheckedChange={v => update({ is_accepting: v })} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Allow Multiple Submissions</Label>
          <p className="text-xs text-muted-foreground">Same person can submit more than once</p>
        </div>
        <Switch checked={settings.allow_multiple_submissions ?? true} onCheckedChange={v => update({ allow_multiple_submissions: v })} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Collect UTM Parameters</Label>
          <p className="text-xs text-muted-foreground">Track traffic sources</p>
        </div>
        <Switch checked={settings.collect_utm ?? false} onCheckedChange={v => update({ collect_utm: v })} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Enable Embedding</Label>
          <p className="text-xs text-muted-foreground">Allow embedding via iframe</p>
        </div>
        <Switch checked={settings.embed_enabled ?? false} onCheckedChange={v => update({ embed_enabled: v })} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Max Submissions</Label>
        <Input
          type="number"
          value={settings.max_submissions || ''}
          onChange={e => update({ max_submissions: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="Unlimited"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Close Date</Label>
        <Input
          type="datetime-local"
          value={settings.close_date ? settings.close_date.slice(0, 16) : ''}
          onChange={e => update({ close_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
        />
        <p className="text-xs text-muted-foreground">Form auto-closes after this date</p>
      </div>
    </div>
  );
}
