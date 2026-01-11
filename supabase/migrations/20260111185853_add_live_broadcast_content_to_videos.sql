-- Add live_broadcast_content column to videos table
ALTER TABLE videos 
ADD COLUMN live_broadcast_content TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN videos.live_broadcast_content IS 'YouTube liveBroadcastContent field: none, upcoming, live, completed';
