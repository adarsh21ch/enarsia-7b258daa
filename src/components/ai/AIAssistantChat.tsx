import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Loader2, User, Copy, Check, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Message = { role: 'user' | 'assistant'; content: string };

const STORAGE_KEY = 'nevorai-chat-history';
const BRIEFING_KEY = 'nevorai-last-briefing-date';

const SUGGESTION_CATEGORIES = [
  {
    label: 'My Numbers',
    items: ['Daily snapshot', "This week's stats", 'My conversion ratios', 'Activity trend'],
  },
  {
    label: 'Team',
    items: ["Who hasn't updated?", 'Team rankings', 'Compare team members', 'Top performers this week'],
  },
  {
    label: 'Prospects',
    items: ['Stale prospects', 'Follow-up needed', 'Team funnel breakdown'],
  },
  {
    label: 'Coaching',
    items: ['Coaching tips', 'What should I improve?', 'Weekly review'],
  },
];

const FOLLOW_UP_MAP: Record<string, string[]> = {
  snapshot: ['Show breakdown by member', 'Compare with last week', 'Show my ratios'],
  team: ['Who needs follow-up?', 'Show team rankings', 'Compare team members'],
  prospect: ['Show stale prospects', 'Team funnel breakdown', 'Funnel analysis'],
  coaching: ['What should I improve?', 'Weekly review', 'Show my ratios'],
  comparison: ['Show daily breakdown', 'Who improved more?', 'Show team rankings'],
  funnel: ['Team funnel breakdown', 'Show stuck prospects', 'Funnel analysis'],
  ratio: ['Compare with last week', 'Show member ratios', 'Activity trend'],
};

function getFollowUps(assistantContent: string): string[] {
  const lower = assistantContent.toLowerCase();
  if (lower.includes('comparison') || lower.includes('vs') || lower.includes('compared')) return FOLLOW_UP_MAP.comparison;
  if (lower.includes('ratio') || lower.includes('conversion') || lower.includes('per day')) return FOLLOW_UP_MAP.ratio;
  if (lower.includes('funnel') || lower.includes('stage') || lower.includes('day 2') || lower.includes('day 3')) return FOLLOW_UP_MAP.funnel;
  if (lower.includes('team') || lower.includes('member')) return FOLLOW_UP_MAP.team;
  if (lower.includes('snapshot') || lower.includes('today') || lower.includes('stats')) return FOLLOW_UP_MAP.snapshot;
  if (lower.includes('prospect') || lower.includes('lead') || lower.includes('stale')) return FOLLOW_UP_MAP.prospect;
  if (lower.includes('coaching') || lower.includes('tip') || lower.includes('improve')) return FOLLOW_UP_MAP.coaching;
  return [];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nevorai-ai`;

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const isBullet = /^[-•*]\s/.test(line.trim());
        const isNumbered = /^\d+\.\s/.test(line.trim());
        const isHeading = /^#{1,3}\s/.test(line.trim());

        let processed = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-xs">$1</code>');

        const safe = DOMPurify.sanitize(processed, { ALLOWED_TAGS: ['strong', 'em', 'code'], ALLOWED_ATTR: ['class'] });

        if (isHeading) {
          const safeHeading = DOMPurify.sanitize(safe.replace(/^#{1,3}\s/, ''), { ALLOWED_TAGS: ['strong', 'em', 'code'], ALLOWED_ATTR: ['class'] });
          return <p key={i} className="font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: safeHeading }} />;
        }
        if (isBullet) {
          const safeBullet = DOMPurify.sanitize(safe.replace(/^[-•*]\s/, ''), { ALLOWED_TAGS: ['strong', 'em', 'code'], ALLOWED_ATTR: ['class'] });
          return <div key={i} className="flex gap-2 pl-2"><span className="text-muted-foreground">•</span><span dangerouslySetInnerHTML={{ __html: safeBullet }} /></div>;
        }
        if (isNumbered) {
          return <div key={i} className="pl-2" dangerouslySetInnerHTML={{ __html: safe }} />;
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: safe }} />;
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded-md hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground" title="Copy">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

interface AIAssistantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantChat({ open, onOpenChange }: AIAssistantChatProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showBriefing, setShowBriefing] = useState(false);

  // Persist messages to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  // Check morning briefing
  useEffect(() => {
    if (!open) return;
    const today = new Date().toDateString();
    const lastBriefing = localStorage.getItem(BRIEFING_KEY);
    if (lastBriefing !== today && messages.length === 0) {
      setShowBriefing(true);
    }
  }, [open, messages.length]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus textarea
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');
    setShowBriefing(false);

    // Mark briefing as done today
    localStorage.setItem(BRIEFING_KEY, new Date().toDateString());

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, auth_token: session?.access_token }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const errMsg = errData.error || `Error ${resp.status}`;
        if (resp.status === 429) toast.error('Rate limit reached. Please wait a moment.');
        else if (resp.status === 402) toast.error('AI credits exhausted. Please add credits.');
        else toast.error(errMsg);
        setIsLoading(false);
        return;
      }

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && resp.body) {
        // SSE streaming
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content
                  || parsed.token
                  || parsed.text
                  || parsed.content
                  || '';
                if (token) {
                  accumulated += token;
                  setStreamingContent(accumulated);
                }
              } catch {
                // If not JSON, treat as plain text token
                if (data && data !== '[DONE]') {
                  accumulated += data;
                  setStreamingContent(accumulated);
                }
              }
            }
          }
        }

        const finalContent = accumulated || "I couldn't process your request. Please try again.";
        setMessages(prev => [...prev, { role: 'assistant', content: finalContent }]);
        setStreamingContent('');
      } else {
        // JSON fallback
        const result = await resp.json();
        const assistantContent = result.response || "I couldn't process your request. Please try again.";
        setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
      }
    } catch (e) {
      console.error('AI chat error:', e);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [messages, isLoading, session?.access_token]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Follow-ups for last assistant message
  const followUps = useMemo(() => {
    if (messages.length === 0) return [];
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return [];
    return getFollowUps(last.content);
  }, [messages]);

  const triggerBriefing = () => {
    sendMessage("Good morning! Give me my daily briefing — daily snapshot summary and team tracking status.");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Enarsia Assistant
            </SheetTitle>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat} title="Clear chat">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 text-center pt-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Ask me anything about your data</p>
                <p className="text-xs text-muted-foreground mt-1">Leads, tracking, team & coaching</p>
              </div>

              {/* Morning Briefing */}
              {showBriefing && (
                <Button
                  variant="outline"
                  className="rounded-full text-xs border-primary/30 text-primary animate-pulse"
                  onClick={triggerBriefing}
                >
                  ☀️ Good morning! Get your daily briefing
                </Button>
              )}

              {/* Categorized suggestions */}
              <div className="w-full space-y-3 mt-2 text-left">
                {SUGGESTION_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{cat.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.items.map(s => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 rounded-full px-3"
                          onClick={() => sendMessage(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <>
                    <SimpleMarkdown content={msg.content} />
                    <div className="flex justify-end mt-1">
                      <CopyButton text={msg.content} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming content */}
          {isLoading && streamingContent && (
            <div className="flex gap-2 justify-start">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <div className="max-w-[85%] bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                <SimpleMarkdown content={streamingContent} />
              </div>
            </div>
          )}

          {/* Loading indicator (no streaming yet) */}
          {isLoading && !streamingContent && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-2 justify-start">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Follow-up chips */}
          {!isLoading && followUps.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-8">
              {followUps.map(f => (
                <Button
                  key={f}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 rounded-full px-3 border-primary/20 text-primary"
                  onClick={() => sendMessage(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/50 px-4 py-3 flex gap-2 items-end flex-shrink-0">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm rounded-xl"
            rows={1}
          />
          <Button
            size="icon"
            className="h-10 w-10 rounded-xl flex-shrink-0"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
