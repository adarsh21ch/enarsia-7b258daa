import { useRef, useCallback, useLayoutEffect, KeyboardEvent } from 'react';
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

function resizeEl(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/** Keep the caret/textarea visible above the keyboard + toolbar */
function keepInView(el: HTMLElement) {
  requestAnimationFrame(() => {
    const vv = window.visualViewport;
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const rect = el.getBoundingClientRect();
    // 72px buffer for the fixed toolbar
    const overshoot = rect.bottom - (visibleBottom - 72);
    if (overshoot > 0) {
      window.scrollBy({ top: overshoot, behavior: 'smooth' });
    }
  });
}

export function RichTextEditor({ blocks, onChange, onActiveBlockChange }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize ALL textareas whenever blocks change (initial load, toolbar actions, etc.)
  useLayoutEffect(() => {
    const inputs = containerRef.current?.querySelectorAll<HTMLTextAreaElement>('[data-block-input]');
    inputs?.forEach(resizeEl);
  }, [blocks]);

  const updateBlock = useCallback((index: number, updates: Partial<NoteBlock>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  }, [blocks, onChange]);

  const focusBlock = useCallback((index: number) => {
    setTimeout(() => {
      const inputs = containerRef.current?.querySelectorAll<HTMLElement>('[data-block-input]');
      const target = inputs?.[index];
      if (target) {
        target.focus();
        keepInView(target);
      }
      onActiveBlockChange?.(index);
    }, 50);
  }, [onActiveBlockChange]);

  const addBlockAfter = useCallback((index: number, type: NoteBlock['type'] = 'text', content = '') => {
    const newBlock: NoteBlock = { id: generateId(), type, content, style: 'normal' };
    if (type === 'checklist') newBlock.checked = false;
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onChange(newBlocks);
    focusBlock(index + 1);
  }, [blocks, onChange, focusBlock]);

  const removeBlock = useCallback((index: number) => {
    if (blocks.length <= 1) return;
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    focusBlock(Math.max(0, index - 1));
  }, [blocks, onChange, focusBlock]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const block = blocks[index];
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const isBullet = block.content.startsWith('• ');
      // Empty list/checklist item → exit the list back to plain text
      if ((block.type === 'checklist' && block.content.trim() === '') || (isBullet && block.content.trim() === '•')) {
        const newBlocks = [...blocks];
        newBlocks[index] = { ...block, type: 'text', content: '', checked: undefined };
        onChange(newBlocks);
        return;
      }
      if (block.type === 'checklist') {
        addBlockAfter(index, 'checklist');
      } else if (isBullet) {
        addBlockAfter(index, 'text', '• ');
      } else {
        addBlockAfter(index, 'text');
      }
    }
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      removeBlock(index);
    }
  }, [blocks, onChange, addBlockAfter, removeBlock]);

  /** Markdown-style quick shortcuts at the start of a block */
  const applyShortcuts = (value: string, block: NoteBlock): Partial<NoteBlock> | null => {
    if (block.type !== 'text' || block.content !== '') return null;
    if (value === '# ') return { type: 'heading', content: '' };
    if (value === '- ' || value === '* ') return { content: '• ' };
    if (value === '[] ' || value === '[ ] ') return { type: 'checklist', content: '', checked: false };
    return null;
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
    const el = e.target;
    resizeEl(el);
    keepInView(el);

    const block = blocks[index];
    const shortcut = applyShortcuts(el.value, block);
    if (shortcut) {
      updateBlock(index, shortcut);
      return;
    }
    updateBlock(index, { content: el.value });
  };

  // Tap on empty space below the last block → focus it
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== containerRef.current) return;
    const inputs = containerRef.current?.querySelectorAll<HTMLElement>('[data-block-input]');
    const last = inputs?.[inputs.length - 1];
    if (last) {
      last.focus();
      onActiveBlockChange?.(blocks.length - 1);
    }
  };

  // Ensure at least one block
  const displayBlocks = blocks.length === 0
    ? [{ id: generateId(), type: 'text' as const, content: '', style: 'normal' as const }]
    : blocks;

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="px-4 py-3 space-y-0.5 min-h-[40vh]"
    >
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
            onChange={(e) => handleInput(e, i)}
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
              resizeEl(e.target);
              onActiveBlockChange?.(i);
            }}
          />
        </div>
      ))}
    </div>
  );
}
