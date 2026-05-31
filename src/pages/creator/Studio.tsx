import { useMemo, useState, useEffect } from 'react';
import { PenLine, Loader2, ArrowRight, Mic } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { useContentIdeas } from '@/hooks/useContentIdeas';
import { useContentPieces } from '@/hooks/useContentPieces';
import { useCreatorAccount } from '@/contexts/CreatorAccountContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function Studio() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ideaId = params.get('idea');
  const { activeAccountId } = useCreatorAccount();

  const { ideas, isLoading, updateIdea } = useContentIdeas();
  const { savePiece, saving } = useContentPieces();

  const idea = useMemo(() => ideas.find((i) => i.id === ideaId) || null, [ideas, ideaId]);

  const [hook, setHook] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('');

  useEffect(() => {
    if (idea && !hook && !body && !cta) {
      if (idea.hook) setHook(idea.hook);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea?.id]);

  const handleSave = async () => {
    if ((!hook.trim() && !body.trim() && !cta.trim()) || saving) return;
    await savePiece({
      idea_id: ideaId,
      account_id: activeAccountId || idea?.account_id || null,
      title: idea?.title || null,
      hook_text: hook || null,
      body_text: body || null,
      cta_text: cta || null,
      script: [hook && `Hook: ${hook}`, body && `Body:\n${body}`, cta && `CTA: ${cta}`].filter(Boolean).join('\n\n'),
      stage: 'scripting',
    });
    if (ideaId) await updateIdea({ id: ideaId, updates: { status: 'scripted' } });
    toast.success('Saved to pipeline');
    navigate('/calendar');
  };

  if (isLoading) {
    return (
      <CreatorTabLayout title="Studio" subtitle="Idea → ready to film">
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </CreatorTabLayout>
    );
  }

  if (!idea) {
    return (
      <CreatorTabLayout title="Studio" subtitle="Idea → ready to film">
        <CreatorEmptyState
          icon={PenLine}
          headline="Pick a topic to script"
          body="Open a topic from the Topics tab and tap “Script” to draft your hook, body and CTA here."
        />
        <Button variant="outline" className="w-full" onClick={() => navigate('/ideas')}>
          Go to Topics<ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </CreatorTabLayout>
    );
  }

  return (
    <CreatorTabLayout title="Studio" subtitle="Idea → ready to film">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Scripting</p>
        <p className="font-semibold text-sm mt-1">{idea.title}</p>
      </div>

      <ScriptSection label="Hook (0–3s)" value={hook} onChange={setHook} placeholder="Grab attention in the first 3 seconds…" rows={3} />
      <ScriptSection label="Body" value={body} onChange={setBody} placeholder="The main content…" rows={7} />
      <ScriptSection label="Call to Action" value={cta} onChange={setCta} placeholder="What should viewers do next?" rows={3} />

      <Button onClick={handleSave} disabled={(!hook.trim() && !body.trim() && !cta.trim()) || saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
        Save to pipeline
      </Button>
    </CreatorTabLayout>
  );
}

function ScriptSection({
  label, value, onChange, placeholder, rows,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string; rows: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        <button
          type="button"
          onClick={() => toast('Voice-to-text coming soon')}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Mic className="h-3 w-3" /> Mic
        </button>
      </div>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="resize-y" />
    </div>
  );
}
