-- Fix duration column type from integer to text to store ISO 8601 format
-- First, add a new column with the correct type
ALTER TABLE videos ADD COLUMN duration_iso8601 TEXT;

-- Copy existing duration_seconds to the new column (convert to ISO format if needed)
-- For now, we'll just set it to null since we're starting fresh
UPDATE videos SET duration_iso8601 = NULL;

-- Drop the old duration column (it was integer)
ALTER TABLE videos DROP COLUMN duration;

-- Rename the new column to duration
ALTER TABLE videos RENAME COLUMN duration_iso8601 TO duration;

-- Add comment
COMMENT ON COLUMN videos.duration IS 'ISO 8601 duration format (e.g., PT14M56S)';
