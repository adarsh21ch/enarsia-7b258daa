import { useState, useRef, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Loader2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  "My stats today",
  "Team performance",
  "Tips to improve",
  "Monthly summary",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nevorai-ai`;

function SimpleMarkdown({ content }: { content: string }) {
  // Basic markdown: bold, italic, bullet points, line breaks
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

        if (isHeading) {
          processed = processed.replace(/^#{1,3}\s/, '');
          return <p key={i} className="font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: processed }} />;
        }
        if (isBullet) {
          processed = processed.replace(/^[-•*]\s/, '');
          return <div key={i} className="flex gap-2 pl-2"><span className="text-muted-foreground">•</span><span dangerouslySetInnerHTML={{ __html: processed }} /></div>;
        }
        if (isNumbered) {
          return <div key={i} className="pl-2" dangerouslySetInnerHTML={{ __html: processed }} />;
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
      })}
    </div>
  );
}

interface AIAssistantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantChat({ open, onOpenChange }: AIAssistantChatProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea when opened
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg: Message = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

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

      const result = await resp.json();
      const assistantContent = result.response || "I couldn't process your request. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (e) {
      console.error('AI chat error:', e);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, session?.access_token]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            NevorAI Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Ask me anything about your data</p>
                <p className="text-xs text-muted-foreground mt-1">I can analyze your leads, tracking, and team performance</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {SUGGESTIONS.map(s => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 rounded-full"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </Button>
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
                  <SimpleMarkdown content={msg.content} />
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

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-2 justify-start">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/50 px-4 py-3 flex gap-2 items-end">
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
