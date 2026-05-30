import { useState } from 'react';
import { Lightbulb, Plus, Loader2, Trash2, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { useContentIdeas, IDEA_STATUSES, type ContentIdea } from '@/hooks/useContentIdeas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<ContentIdea['status'], string> = {
  spark: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  developing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  scripted: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30',
  done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
};

const STATUS_LABEL: Record<ContentIdea['status'], string> = {
  spark: 'Spark',
  developing: 'Developing',
  scripted: 'Scripted',
  done: 'Done',
};

/**
 * Tab 1 — IDEAS. Quick-capture + idea vault (working CRUD). Hook bank /
 * trending / swipe-file (AI + competitor sources) land in later steps.
 */
export default function Ideas() {
  const navigate = useNavigate();
  const { ideas, isLoading, createIdea, creating, updateIdea, deleteIdea } = useContentIdeas();
  const [title, setTitle] = useState('');

  const handleAdd = async () => {
    if (!title.trim() || creating) return;
    await createIdea({ title });
    setTitle('');
  };

  const cycleStatus = (idea: ContentIdea) => {
    const i = IDEA_STATUSES.indexOf(idea.status);
    const next = IDEA_STATUSES[(i + 1) % IDEA_STATUSES.length];
    updateIdea({ id: idea.id, updates: { status: next } });
  };

  return (
    <CreatorTabLayout title="Ideas" subtitle="What to make next">
      {/* Quick capture */}
      <div className="rounded-2xl border border-border/50 bg-card p-3">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Capture an idea…"
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={!title.trim() || creating} size="icon" className="shrink-0">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : ideas.length === 0 ? (
        <CreatorEmptyState
          icon={Lightbulb}
          headline="Your idea engine"
          body="Capture sparks above. Soon: AI hook bank, what's trending in your niche, and a swipe file you can remix — then send any idea to Studio to script it."
          bullets={[
            'Hook Bank — AI hooks tagged by proven type',
            'Trending in your niche — from tracked competitors',
            'Swipe file — save viral posts and remix with AI',
          ]}
        />
      ) : (
        <div className="space-y-2">
          {ideas.map((idea) => (
            <div key={idea.id} className="rounded-xl border border-border/50 bg-card p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-snug">{idea.title}</p>
                {idea.hook && <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{idea.hook}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => cycleStatus(idea)}
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors',
                      STATUS_STYLE[idea.status],
                    )}
                  >
                    {STATUS_LABEL[idea.status]}
                  </button>
                  {idea.source === 'ai' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Sparkles className="h-2.5 w-2.5" /> AI
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => navigate(`/studio?idea=${idea.id}`)}
                >
                  Script
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteIdea(idea.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CreatorTabLayout>
  );
}
