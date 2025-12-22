import { useState } from 'react';
import { useDirectTeam } from '@/hooks/useDirectTeam';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useLeaderLevels } from '@/hooks/useLeaderLevels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';

type TargetType = 'all' | 'level' | 'single';

interface DeepLinkOption {
  label: string;
  route: string | null;
}

const DEEP_LINK_OPTIONS: DeepLinkOption[] = [
  { label: 'None', route: null },
  { label: 'Open To-Do Daily Tasks (today)', route: `/action?tab=daily&date=${format(new Date(), 'yyyy-MM-dd')}` },
  { label: 'Open To-Do List', route: '/action?tab=list' }
];

export function SendMessageSection() {
  const { members, hasDirectTeam, loading: teamLoading } = useDirectTeam();
  const { levels, loading: levelsLoading } = useLeaderLevels();
  const { sendMessage, sending } = useSendMessage();

  const [targetType, setTargetType] = useState<TargetType>('all');
  const [targetLevel, setTargetLevel] = useState<string>('');
  const [targetMember, setTargetMember] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState<string>('none');

  // Don't show if user has no direct team
  if (teamLoading || levelsLoading) {
    return null;
  }

  if (!hasDirectTeam) {
    return null;
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;

    const selectedDeepLink = DEEP_LINK_OPTIONS.find(o => o.label === deepLink)?.route || null;

    const result = await sendMessage({
      title: title.trim(),
      body: body.trim(),
      deepLinkRoute: selectedDeepLink,
      targetType,
      targetLevelPosition: targetType === 'level' ? parseInt(targetLevel) : null,
      targetUserId: targetType === 'single' ? targetMember : null,
      members
    });

    if (result.success) {
      // Clear form
      setTitle('');
      setBody('');
      setDeepLink('none');
      setTargetType('all');
      setTargetLevel('');
      setTargetMember('');
    }
  };

  // Get members filtered by level if needed
  const getMembersForLevel = (position: number) => {
    return members.filter(m => m.level_position === position);
  };

  // Get recipient count for preview
  const getRecipientCount = () => {
    if (targetType === 'all') return members.length;
    if (targetType === 'level' && targetLevel) {
      return getMembersForLevel(parseInt(targetLevel)).length;
    }
    if (targetType === 'single' && targetMember) return 1;
    return 0;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 rounded-lg bg-primary/10">
            <Send className="h-4 w-4 text-primary" />
          </div>
          Send Message to Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Type */}
        <div className="space-y-2">
          <Label>Send to</Label>
          <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select recipients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team ({members.length})</SelectItem>
              <SelectItem value="level">By level</SelectItem>
              <SelectItem value="single">Single member</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Level selector */}
        {targetType === 'level' && (
          <div className="space-y-2">
            <Label>Select Level</Label>
            <Select value={targetLevel} onValueChange={setTargetLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Choose level" />
              </SelectTrigger>
              <SelectContent>
                {levels.map(level => {
                  const count = getMembersForLevel(level.position).length;
                  return (
                    <SelectItem key={level.id} value={level.position.toString()}>
                      {level.label} ({count} member{count !== 1 ? 's' : ''})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Single member selector */}
        {targetType === 'single' && (
          <div className="space-y-2">
            <Label>Select Member</Label>
            <Select value={targetMember} onValueChange={setTargetMember}>
              <SelectTrigger>
                <SelectValue placeholder="Choose member" />
              </SelectTrigger>
              <SelectContent>
                {members.map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.display_name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            placeholder="Message title"
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground text-right">{title.length}/60</p>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            placeholder="Write your message..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{body.length}/500</p>
        </div>

        {/* Deep Link */}
        <div className="space-y-2">
          <Label>Quick action link (optional)</Label>
          <Select value={deepLink} onValueChange={setDeepLink}>
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {DEEP_LINK_OPTIONS.map(option => (
                <SelectItem key={option.label} value={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!title.trim() || !body.trim() || sending || getRecipientCount() === 0}
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Send to {getRecipientCount()} member{getRecipientCount() !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
