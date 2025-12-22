-- Create inbox_messages table
CREATE TABLE public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  sender_user_id uuid NOT NULL,
  leader_id uuid NULL,
  target_level_position integer NULL,
  message_type text NOT NULL DEFAULT 'broadcast',
  title text NOT NULL,
  body text NOT NULL,
  deep_link_route text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL,
  archived boolean NOT NULL DEFAULT false,
  CONSTRAINT inbox_messages_message_type_check CHECK (message_type IN ('broadcast', 'task_today_only', 'system'))
);

-- Create indexes for performance
CREATE INDEX idx_inbox_messages_recipient_read ON inbox_messages(recipient_user_id, read_at);
CREATE INDEX idx_inbox_messages_recipient_created ON inbox_messages(recipient_user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT only their own received messages
CREATE POLICY "Users can view their own inbox messages"
ON public.inbox_messages
FOR SELECT
USING (recipient_user_id = auth.uid());

-- RLS Policy: Users can UPDATE only their own received messages (read_at, archived)
CREATE POLICY "Users can update their own inbox messages"
ON public.inbox_messages
FOR UPDATE
USING (recipient_user_id = auth.uid());

-- RLS Policy: Leaders can INSERT messages to their direct team members
CREATE POLICY "Leaders can send messages to direct team"
ON public.inbox_messages
FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    -- Recipient is in sender's direct team (leader_id points to sender)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = inbox_messages.recipient_user_id
        AND UPPER(p.leaders_id_of_my_leader) = (
          SELECT UPPER(neverai_id) FROM profiles WHERE user_id = auth.uid()
        )
    )
    -- OR sender can message themselves
    OR recipient_user_id = auth.uid()
  )
);

-- RLS Policy: Prevent DELETE
CREATE POLICY "Deny delete on inbox_messages"
ON public.inbox_messages
FOR DELETE
USING (false);