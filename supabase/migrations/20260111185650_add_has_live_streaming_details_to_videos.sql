-- Add has_live_streaming_details column to videos table
ALTER TABLE videos 
ADD COLUMN has_live_streaming_details BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN videos.has_live_streaming_details IS 'Indicates if the video was/is a livestream (has liveStreamingDetails in YouTube API)';
