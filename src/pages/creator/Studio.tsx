import { useMemo, useState, useEffect } from 'react';
import { PenLine, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { useContentIdeas } from '@/hooks/useContentIdeas';
import { useContentPieces } from '@/hooks/useContentPieces';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

/**
 * Tab 2 — STUDIO. Turns an idea into a content piece: write hook/body/CTA +
 * caption + hashtags, save it into the pipeline (content_pieces) and mark the
 * idea "scripted". AI Scriptwriter (Nev AI persona) gets wired in the next step.
 */
export default function Studio() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ideaId = params.get('idea');

  const { ideas, isLoading, updateIdea } = useContentIdeas();
  const { savePiece, saving } = useContentPieces();

  const idea = useMemo(() => ideas.find((i) => i.id === ideaId) || null, [ideas, ideaId]);

  const [script, setScript] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');

  // Seed the script with the idea's hook when an idea is opened.
  useEffect(() => {
    if (idea && !script) {
      setScript(idea.hook ? `Hook: ${idea.hook}\n\nBody:\n\nCTA:` : 'Hook (0-3s):\n\nBody:\n\nCTA:');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea?.id]);

  const handleSave = async () => {
    if (!script.trim() || saving) return;
    await savePiece({
      idea_id: ideaId,
      script,
      caption,
      hashtags: hashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, '').trim())
        .filter(Boolean),
      stage: 'scripting',
    });
    if (ideaId) await updateIdea({ id: ideaId, updates: { status: 'scripted' } });
    navigate('/calendar');
  };

  if (isLoading) {
    return (
      <CreatorTabLayout title="Studio" subtitle="Idea → ready to film">
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </CreatorTabLayout>
    );
  }

  // No idea selected → guide the user back to Ideas.
  if (!idea) {
    return (
      <CreatorTabLayout title="Studio" subtitle="Idea → ready to film">
        <CreatorEmptyState
          icon={PenLine}
          headline="Pick an idea to script"
          body="Open an idea from the Ideas tab and tap “Script” to draft a hook, body and CTA here, then save it into your Calendar pipeline."
          bullets={[
            'AI Scriptwriter in your voice — coming next',
            'Caption + hashtag generator',
            'Repurpose one video into Reel + carousel + thread',
          ]}
        />
        <Button variant="outline" className="w-full" onClick={() => navigate('/ideas')}>
          Go to Ideas
          <ArrowRight className="h-4 w-4 ml-1.5" />
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

      <div className="rounded-2xl border border-dashed border-primary/30 bg-card p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span>Nev AI Scriptwriter (your-voice drafts) plugs in here next step.</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground px-1">Script (Hook → Body → CTA)</label>
        <Textarea value={script} onChange={(e) => setScript(e.target.value)} rows={9} className="resize-y" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground px-1">Caption</label>
        <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} className="resize-y" placeholder="Caption for the post…" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground px-1">Hashtags</label>
        <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#reels #howto #niche" />
      </div>

      <Button onClick={handleSave} disabled={!script.trim() || saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
        Add to Calendar
      </Button>
    </CreatorTabLayout>
  );
}
