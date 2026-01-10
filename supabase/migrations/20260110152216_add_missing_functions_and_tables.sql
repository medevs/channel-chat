-- Add missing RPC functions and tables for RAG functionality

-- Add missing columns to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS ingestion_method TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'video' CHECK (content_type IN ('video', 'short', 'live'));

-- Create user_creators table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- Enable RLS on user_creators
ALTER TABLE user_creators ENABLE ROW LEVEL SECURITY;

-- RLS policy for user_creators
DROP POLICY IF EXISTS "Users can access their own creator links" ON user_creators;
CREATE POLICY "Users can access their own creator links" ON user_creators FOR ALL USING (auth.uid() = user_id);

-- RPC function to increment creator count
CREATE OR REPLACE FUNCTION increment_creator_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_usage (user_id, creators_added)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    creators_added = user_usage.creators_added + 1,
    updated_at = NOW();
END;
$$;

-- RPC function to increment videos indexed count
CREATE OR REPLACE FUNCTION increment_videos_indexed(p_user_id uuid, p_count int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_usage (user_id, videos_indexed)
  VALUES (p_user_id, p_count)
  ON CONFLICT (user_id) DO UPDATE SET
    videos_indexed = user_usage.videos_indexed + p_count,
    updated_at = NOW();
END;
$$;
