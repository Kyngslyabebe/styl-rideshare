-- Support tickets from riders (structured, not free chat)
-- Admin reviews and responds. Protects drivers from report abuse.

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('safety', 'billing', 'app_issue', 'ride_dispute', 'account', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  ride_id UUID REFERENCES rides(id),
  reported_driver_id UUID REFERENCES drivers(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_rider ON support_tickets(rider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);

-- RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to support tickets"
ON support_tickets FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Riders can view their own tickets
CREATE POLICY "Riders can view own tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (rider_id = auth.uid());

-- Riders can create tickets
CREATE POLICY "Riders can create tickets"
ON support_tickets FOR INSERT
TO authenticated
WITH CHECK (rider_id = auth.uid());

-- Ticket responses (admin replies to tickets)
CREATE TABLE IF NOT EXISTS ticket_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'rider')),
  sender_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket ON ticket_responses(ticket_id, created_at);

ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to ticket responses"
ON ticket_responses FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Riders can read responses on their own tickets
CREATE POLICY "Riders can read own ticket responses"
ON ticket_responses FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND rider_id = auth.uid())
);

-- Riders can reply to their own tickets
CREATE POLICY "Riders can reply to own tickets"
ON ticket_responses FOR INSERT
TO authenticated
WITH CHECK (
  sender_role = 'rider' AND
  EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND rider_id = auth.uid())
);
