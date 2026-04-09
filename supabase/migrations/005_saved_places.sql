-- Add home/work address columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_address TEXT;
