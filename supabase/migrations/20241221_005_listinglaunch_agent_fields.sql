-- Add ListingLaunch auto-launch fields to agents table
-- Version: 1.0.0
-- Date: 2024-12-21
-- Description: Enable agents to opt-in to automatic campaign launching when media is delivered

ALTER TABLE agents ADD COLUMN IF NOT EXISTS listinglaunch_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS listinglaunch_auto_launch BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN agents.listinglaunch_enabled IS 'Whether the agent has access to ListingLaunch feature';
COMMENT ON COLUMN agents.listinglaunch_auto_launch IS 'Whether to automatically create campaigns when media is delivered';
