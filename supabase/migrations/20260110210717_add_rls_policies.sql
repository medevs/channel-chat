-- Add user_id column to channels table and implement Row Level Security policies
-- This migration adds proper user association and data isolation

-- Add user_id column to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_user_channel ON channels(user_id, channel_id);

-- Enable Row Level Security on channels table
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on videos table
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on transcript_chunks table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transcript_chunks') THEN
        EXECUTE 'ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- RLS Policy: Users can only see their own channels
CREATE POLICY "Users can view their own channels" ON channels
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert channels for themselves
CREATE POLICY "Users can insert their own channels" ON channels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own channels
CREATE POLICY "Users can update their own channels" ON channels
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own channels
CREATE POLICY "Users can delete their own channels" ON channels
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policy: Users can only see videos from their channels
CREATE POLICY "Users can view videos from their channels" ON videos
    FOR SELECT USING (
        channel_id IN (
            SELECT channel_id FROM channels WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can only insert videos for their channels
CREATE POLICY "Users can insert videos for their channels" ON videos
    FOR INSERT WITH CHECK (
        channel_id IN (
            SELECT channel_id FROM channels WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can only update videos from their channels
CREATE POLICY "Users can update videos from their channels" ON videos
    FOR UPDATE USING (
        channel_id IN (
            SELECT channel_id FROM channels WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can only delete videos from their channels
CREATE POLICY "Users can delete videos from their channels" ON videos
    FOR DELETE USING (
        channel_id IN (
            SELECT channel_id FROM channels WHERE user_id = auth.uid()
        )
    );

-- RLS Policy for transcript_chunks (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transcript_chunks') THEN
        -- Users can view transcript chunks from their channels
        EXECUTE 'CREATE POLICY "Users can view transcript chunks from their channels" ON transcript_chunks
            FOR SELECT USING (
                channel_id IN (
                    SELECT channel_id FROM channels WHERE user_id = auth.uid()
                )
            )';
        
        -- Users can insert transcript chunks for their channels
        EXECUTE 'CREATE POLICY "Users can insert transcript chunks for their channels" ON transcript_chunks
            FOR INSERT WITH CHECK (
                channel_id IN (
                    SELECT channel_id FROM channels WHERE user_id = auth.uid()
                )
            )';
        
        -- Users can update transcript chunks from their channels
        EXECUTE 'CREATE POLICY "Users can update transcript chunks from their channels" ON transcript_chunks
            FOR UPDATE USING (
                channel_id IN (
                    SELECT channel_id FROM channels WHERE user_id = auth.uid()
                )
            )';
        
        -- Users can delete transcript chunks from their channels
        EXECUTE 'CREATE POLICY "Users can delete transcript chunks from their channels" ON transcript_chunks
            FOR DELETE USING (
                channel_id IN (
                    SELECT channel_id FROM channels WHERE user_id = auth.uid()
                )
            )';
    END IF;
END $$;

-- Service role bypass policies (for system operations)
-- These allow the service role to access all data for system operations

CREATE POLICY "Service role can access all channels" ON channels
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can access all videos" ON videos
    FOR ALL USING (current_setting('role') = 'service_role');

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transcript_chunks') THEN
        EXECUTE 'CREATE POLICY "Service role can access all transcript chunks" ON transcript_chunks
            FOR ALL USING (current_setting(''role'') = ''service_role'')';
    END IF;
END $$;

-- Update existing channels to have a user_id (if any exist without one)
-- This is a one-time migration step - in production you'd need to handle this carefully
-- For now, we'll leave existing channels without user_id (they won't be accessible via RLS)

-- Create function to get user channels with proper security
CREATE OR REPLACE FUNCTION get_user_channels(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    id UUID,
    channel_id TEXT,
    channel_name TEXT,
    channel_url TEXT,
    avatar_url TEXT,
    subscriber_count TEXT,
    indexed_videos INTEGER,
    total_videos INTEGER,
    ingestion_status TEXT,
    ingestion_progress INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow users to get their own channels
    IF p_user_id != auth.uid() AND current_setting('role') != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: can only access own channels';
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.channel_id,
        c.channel_name,
        c.channel_url,
        c.avatar_url,
        c.subscriber_count,
        c.indexed_videos,
        c.total_videos,
        c.ingestion_status,
        c.ingestion_progress,
        c.created_at,
        c.updated_at
    FROM channels c
    WHERE c.user_id = p_user_id;
END;
$$;
