-- Add approval action tracking fields
ALTER TABLE gov_approval_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE gov_approval_requests ADD COLUMN IF NOT EXISTS action_executed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE gov_approval_requests ADD COLUMN IF NOT EXISTS action_executed_at TIMESTAMP;
