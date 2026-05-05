-- Add ESN OAuth fields to volunteers table
ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS esn_sub TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for fast lookup by ESN subject
CREATE INDEX IF NOT EXISTS idx_volunteers_esn_sub ON volunteers(esn_sub);
