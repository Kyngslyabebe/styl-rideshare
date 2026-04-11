-- Add columns to drivers table needed by admin panel
-- is_suspended: allows admin to suspend/unsuspend drivers
-- document_status: tracks document review workflow
-- approved_at: timestamp when driver was approved
-- approved_ride_types: array of ride types driver can accept
-- documents: JSONB storing document URLs (profile_photo, license_front, etc.)
-- documents_submitted_at: when documents were uploaded

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS document_status TEXT DEFAULT 'pending_review'
  CHECK (document_status IN ('pending_review', 'approved', 'rejected'));
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_ride_types JSONB DEFAULT '[]'::jsonb;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents_submitted_at TIMESTAMPTZ;

-- Backfill: if a driver is already approved, set document_status to 'approved'
UPDATE drivers SET document_status = 'approved' WHERE is_approved = TRUE AND document_status = 'pending_review';
