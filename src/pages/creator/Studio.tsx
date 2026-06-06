import { useMemo, useState, useEffect } from 'react';
import { PenLine, Loader2, ArrowRight, Lightbulb } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { useContentIdeas } from '@/hooks/useContentIdeas';
import { useContentPieces } from '@/hooks/useContentPieces';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
import { AudioRecorderField } from '@/components/creator/AudioRecorderField';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Studio() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const ideaId = params.get('idea');
  const { activeAccountId } = useCreatorAccount();

  // Intentionally fetch ALL ideas (no account filter) so the picker always works.
  const { ideas, isLoading, updateIdea } = useContentIdeas();
  const { savePiece, saving } = useContentPieces();

  const idea = useMemo(() => ideas.find((i) => i.id === ideaId) || null, [ideas, ideaId]);
  const pickable = useMemo(() => ideas.filter((i) => i.status !== 'done'), [ideas]);

  const [hook, setHook] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('');
  const [hookAudio, setHookAudio] = useState<string | null>(null);
  const [bodyAudio, setBodyAudio] = useState<string | null>(null);
  const [ctaAudio, setCtaAudio] = useState<string | null>(null);

  useEffect(() => {
    if (idea && !hook && !body && !cta) {
      if (idea.hook) setHook(idea.hook);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea?.id]);

  const handleSave = async () => {
    const anyText = hook.trim() || body.trim() || cta.trim();
    const anyAudio = hookAudio || bodyAudio || ctaAudio;
    if ((!anyText && !anyAudio) || saving) return;
    await savePiece({
      idea_id: ideaId,
      account_id: activeAccountId || idea?.account_id || null,
      title: idea?.title || null,
      hook_text: hook || null,
      body_text: body || null,
      cta_text: cta || null,
      hook_audio_url: hookAudio,
      body_audio_url: bodyAudio,
      cta_audio_url: ctaAudio,
      script: [hook && `Hook: ${hook}`, body && `Body:\n${body}`, cta && `CTA: ${cta}`].filter(Boolean).join('\n\n'),
      stage: 'scripting',
    });
    if (ideaId) await updateIdea({ id: ideaId, updates: { status: 'scripted' } });
    toast.success('Saved to pipeline');
    navigate('/creator/calendar');
  };

  if (isLoading) {
    return (
      <CreatorTabLayout title="Scripting" subtitle="Idea → ready to film">
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </CreatorTabLayout>
    );
  }

  if (!idea) {
    return (
      <CreatorTabLayout title="Scripting" subtitle="Idea → ready to film">
        {pickable.length > 0 ? (
          <>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2 px-1">
                Pick a topic to script
              </p>
              <div className="space-y-2">
                {pickable.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => setParams({ idea: i.id })}
                    className="w-full text-left p-3 rounded-xl border border-border/50 bg-card flex items-center gap-3 active:bg-muted/40 hover:border-primary/40 transition-colors"
                  >
                    <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">{i.title}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <CreatorEmptyState
              icon={PenLine}
              headline="Capture a topic first"
              body="Add a topic in the Topics tab, then come back here to draft your hook, body and CTA."
            />
            <Button variant="outline" className="w-full" onClick={() => navigate('/creator/ideas')}>
              Go to Topics<ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </>
        )}
      </CreatorTabLayout>
    );
  }

  const canSave = (hook.trim() || body.trim() || cta.trim() || hookAudio || bodyAudio || ctaAudio) && !saving;

  return (
    <CreatorTabLayout title="Scripting" subtitle="Idea → ready to film">
      {/* Topic picker — horizontal chips */}
      {pickable.length > 1 && (
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 pb-1">
            {pickable.map((i) => (
              <button
                key={i.id}
                onClick={() => setParams({ idea: i.id })}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap max-w-[180px] truncate transition-colors',
                  i.id === idea.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border/50 text-muted-foreground hover:text-foreground',
                )}
              >
                {i.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Scripting</p>
        <p className="font-semibold text-sm mt-1">{idea.title}</p>
      </div>

      <ScriptSection
        label="Hook (0–3s)"
        value={hook} onChange={setHook}
        audioUrl={hookAudio} onAudioChange={setHookAudio}
        placeholder="Grab attention in the first 3 seconds…" rows={3}
      />
      <ScriptSection
        label="Body"
        value={body} onChange={setBody}
        audioUrl={bodyAudio} onAudioChange={setBodyAudio}
        placeholder="The main content…" rows={7}
      />
      <ScriptSection
        label="Call to Action"
        value={cta} onChange={setCta}
        audioUrl={ctaAudio} onAudioChange={setCtaAudio}
        placeholder="What should viewers do next?" rows={3}
      />

      <Button onClick={handleSave} disabled={!canSave} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
        Save to pipeline
      </Button>
    </CreatorTabLayout>
  );
}

function ScriptSection({
  label, value, onChange, placeholder, rows, audioUrl, onAudioChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows: number;
  audioUrl: string | null;
  onAudioChange: (url: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1 gap-2">
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        <AudioRecorderField value={audioUrl} onChange={onAudioChange} compact label="Mic" />
      </div>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="resize-y" />
    </div>
  );
}
