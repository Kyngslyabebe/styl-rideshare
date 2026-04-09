-- Support messages between admin and drivers
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'driver')),
  sender_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_driver ON support_messages(driver_id, created_at);

-- RLS policies
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to support messages"
ON support_messages FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Drivers can read their own messages
CREATE POLICY "Drivers can read own messages"
ON support_messages FOR SELECT
TO authenticated
USING (driver_id = auth.uid());

-- Drivers can send messages
CREATE POLICY "Drivers can send messages"
ON support_messages FOR INSERT
TO authenticated
WITH CHECK (driver_id = auth.uid() AND sender_role = 'driver');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
