-- Remove unused public_chat_limits table
-- This table was designed for unauthenticated rate limiting but never implemented
-- The app requires authentication, making this table unnecessary

-- Drop the table (will cascade to any dependent objects)
DROP TABLE IF EXISTS public.public_chat_limits CASCADE;

-- Verify table is removed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'public_chat_limits'
  ) THEN
    RAISE EXCEPTION 'Failed to drop public_chat_limits table';
  END IF;
END $$;
