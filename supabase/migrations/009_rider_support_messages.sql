-- Extend support_messages to support riders as well
-- Add rider_id column (nullable — a message is either driver or rider)
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update sender_role check to include 'rider'
ALTER TABLE support_messages DROP CONSTRAINT IF EXISTS support_messages_sender_role_check;
ALTER TABLE support_messages ADD CONSTRAINT support_messages_sender_role_check
  CHECK (sender_role IN ('admin', 'driver', 'rider'));

-- Index for rider messages
CREATE INDEX IF NOT EXISTS idx_support_messages_rider ON support_messages(rider_id, created_at);

-- RLS: Riders can read their own messages
CREATE POLICY "Riders can read own messages"
ON support_messages FOR SELECT
TO authenticated
USING (rider_id = auth.uid());

-- RLS: Riders can send messages
CREATE POLICY "Riders can send messages"
ON support_messages FOR INSERT
TO authenticated
WITH CHECK (rider_id = auth.uid() AND sender_role = 'rider');
