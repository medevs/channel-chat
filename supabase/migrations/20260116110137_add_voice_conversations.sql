-- Create voice_conversations table for storing voice chat history
-- This table stores complete conversation transcripts and metadata for voice interactions

CREATE TABLE IF NOT EXISTS public.voice_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_voice_conversations_user_id ON public.voice_conversations(user_id);
CREATE INDEX idx_voice_conversations_channel_id ON public.voice_conversations(channel_id);
CREATE INDEX idx_voice_conversations_created_at ON public.voice_conversations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.voice_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own voice conversations
CREATE POLICY "Users can view their own voice conversations"
  ON public.voice_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice conversations"
  ON public.voice_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice conversations"
  ON public.voice_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice conversations"
  ON public.voice_conversations FOR DELETE
  USING (auth.uid() = user_id);
