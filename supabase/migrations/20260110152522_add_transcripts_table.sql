-- Add missing transcripts table and update transcript_chunks structure

-- Create transcripts table to store video transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(video_id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  full_text TEXT,
  segments JSONB,
  source_type TEXT NOT NULL DEFAULT 'caption',
  confidence REAL,
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'no_captions')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id)
);

-- Add missing columns to transcript_chunks
ALTER TABLE transcript_chunks ADD COLUMN IF NOT EXISTS transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE;
ALTER TABLE transcript_chunks ADD COLUMN IF NOT EXISTS token_count INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_channel_id ON transcripts(channel_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(extraction_status);
CREATE INDEX IF NOT EXISTS idx_chunks_transcript_id ON transcript_chunks(transcript_id);

-- Enable RLS
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- RLS policies for transcripts
CREATE POLICY "Transcripts are publicly readable" ON transcripts FOR SELECT USING (true);
CREATE POLICY "Service role can manage transcripts" ON transcripts FOR ALL USING (auth.role() = 'service_role');

-- Update triggers
CREATE TRIGGER update_transcripts_updated_at
BEFORE UPDATE ON transcripts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
