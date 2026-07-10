-- 0051_profiles_account_status.sql
-- Add account_status column to profiles for admin user management
-- (active, suspended, banned). Enables admin suspend/ban functionality.
-- account_status defaults to 'active' for all existing profiles.

ALTER TABLE profiles ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended', 'banned'));

-- Index for filtering by status in the admin users table.
CREATE INDEX IF NOT EXISTS idx_profiles_account_status
  ON profiles(account_status);
