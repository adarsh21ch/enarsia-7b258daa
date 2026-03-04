import { useRef, useCallback, KeyboardEvent } from 'react';
import { NoteBlock } from '@/hooks/useNotes';
import { cn } from '@/lib/utils';
import { Square, CheckSquare2 } from 'lucide-react';

interface RichTextEditorProps {
  blocks: NoteBlock[];
  onChange: (blocks: NoteBlock[]) => void;
  onActiveBlockChange?: (index: number) => void;
}

function generateId() {
  return crypto.randomUUID().slice(0, 8);
}

export function RichTextEditor({ blocks, onChange, onActiveBlockChange }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const updateBlock = useCallback((index: number, updates: Partial<NoteBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  }, [blocks, onChange]);

  const addBlockAfter = useCallback((index: number, type: NoteBlock['type'] = 'text') => {
    const newBlock: NoteBlock = { id: generateId(), type, content: '', style: 'normal' };
    if (type === 'checklist') newBlock.checked = false;
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onChange(newBlocks);
    // Focus new block after render
    setTimeout(() => {
      const inputs = containerRef.current?.querySelectorAll('[data-block-input]');
      const target = inputs?.[index + 1] as HTMLElement;
      target?.focus();
      onActiveBlockChange?.(index + 1);
    }, 50);
  }, [blocks, onChange, onActiveBlockChange]);

  const removeBlock = useCallback((index: number) => {
    if (blocks.length <= 1) return;
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    setTimeout(() => {
      const inputs = containerRef.current?.querySelectorAll('[data-block-input]');
      const targetIndex = Math.max(0, index - 1);
      const target = inputs?.[targetIndex] as HTMLElement;
      target?.focus();
      onActiveBlockChange?.(targetIndex);
    }, 50);
  }, [blocks, onChange, onActiveBlockChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const block = blocks[index];
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlockAfter(index, block.type === 'checklist' ? 'checklist' : 'text');
    }
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      removeBlock(index);
    }
  }, [blocks, addBlockAfter, removeBlock]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  // Ensure at least one block
  const displayBlocks = blocks.length === 0
    ? [{ id: generateId(), type: 'text' as const, content: '', style: 'normal' as const }]
    : blocks;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
      {displayBlocks.map((block, i) => (
        <div key={block.id} className="flex items-start gap-1.5">
          {block.type === 'checklist' && (
            <button
              onClick={() => updateBlock(i, { checked: !block.checked })}
              className="mt-1.5 shrink-0"
            >
              {block.checked ? (
                <CheckSquare2 className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground/50" />
              )}
            </button>
          )}
          <textarea
            data-block-input
            rows={1}
            value={block.content}
            onChange={(e) => {
              handleInput(e);
              updateBlock(i, { content: e.target.value });
            }}
            onKeyDown={(e) => handleKeyDown(e, i)}
            placeholder={
              block.type === 'heading' ? 'Heading...'
              : block.type === 'checklist' ? 'To-do item...'
              : i === 0 && blocks.length <= 1 ? 'Start typing your note...'
              : ''
            }
            className={cn(
              "w-full bg-transparent resize-none outline-none leading-relaxed",
              "placeholder:text-muted-foreground/40",
              block.type === 'heading' && "text-lg font-semibold",
              block.type === 'text' && block.style === 'bold' && "font-semibold",
              block.type === 'text' && block.style === 'italic' && "italic",
              block.type === 'checklist' && block.checked && "line-through text-muted-foreground/60",
              "text-sm"
            )}
            style={{ overflow: 'hidden', minHeight: '1.75rem' }}
             onFocus={(e) => {
               e.target.style.height = 'auto';
               e.target.style.height = e.target.scrollHeight + 'px';
               onActiveBlockChange?.(i);
             }}
          />
        </div>
      ))}
    </div>
  );
}
