-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Channels table for YouTube creators
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  avatar_url TEXT,
  subscriber_count TEXT,
  indexed_videos INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  ingestion_status TEXT DEFAULT 'pending' CHECK (ingestion_status IN ('pending', 'processing', 'extracting', 'completed', 'partial', 'failed', 'no_captions')),
  ingestion_progress INTEGER DEFAULT 0 CHECK (ingestion_progress >= 0 AND ingestion_progress <= 100),
  ingestion_method TEXT,
  error_message TEXT,
  last_indexed_at TIMESTAMPTZ,
  ingest_videos BOOLEAN DEFAULT true,
  ingest_shorts BOOLEAN DEFAULT true,
  ingest_lives BOOLEAN DEFAULT true,
  video_import_mode TEXT DEFAULT 'latest' CHECK (video_import_mode IN ('latest', 'oldest', 'all')),
  video_import_limit INTEGER,
  public_slug TEXT UNIQUE,
  uploads_playlist_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table for individual YouTube videos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT UNIQUE NOT NULL,
  channel_id TEXT NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT, -- ISO 8601 duration format
  duration_seconds INTEGER, -- in seconds
  published_at TIMESTAMPTZ,
  thumbnail_url TEXT,
  view_count BIGINT,
  like_count INTEGER,
  comment_count INTEGER,
  transcript_status TEXT DEFAULT 'pending' CHECK (transcript_status IN ('pending', 'processing', 'completed', 'failed', 'no_captions')),
  transcript_language TEXT,
  ingestion_method TEXT,
  content_type TEXT DEFAULT 'video' CHECK (content_type IN ('video', 'short', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcript chunks table for RAG vector search
CREATE TABLE transcript_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL REFERENCES videos(video_id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_time REAL, -- in seconds
  end_time REAL, -- in seconds
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  embedding_status TEXT DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, chunk_index)
);

-- Chat sessions table for persistent conversations
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Chat messages table for conversation history
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB, -- Array of VideoSource objects
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User usage tracking for rate limiting
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  messages_sent_today INTEGER DEFAULT 0,
  last_message_date DATE DEFAULT CURRENT_DATE,
  creators_added INTEGER DEFAULT 0,
  videos_indexed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User-creator relationships for tracking which creators each user has added
CREATE TABLE user_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- Public chat limits for unauthenticated users
CREATE TABLE public_chat_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- Client fingerprint or IP
  channel_id TEXT NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
  messages_today INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, channel_id)
);

-- Error logs for monitoring
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_channels_channel_id ON channels(channel_id);
CREATE INDEX idx_channels_public_slug ON channels(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_videos_channel_id ON videos(channel_id);
CREATE INDEX idx_videos_video_id ON videos(video_id);
CREATE INDEX idx_transcript_chunks_video_id ON transcript_chunks(video_id);
CREATE INDEX idx_transcript_chunks_channel_id ON transcript_chunks(channel_id);
CREATE INDEX idx_transcript_chunks_embedding ON transcript_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_chat_sessions_user_channel ON chat_sessions(user_id, channel_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX idx_public_chat_limits_identifier_channel ON public_chat_limits(identifier, channel_id);

-- RPC function for vector similarity search
CREATE OR REPLACE FUNCTION search_transcript_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.15,
  match_count int DEFAULT 10,
  filter_channel_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  video_id text,
  channel_id text,
  chunk_index int,
  text text,
  start_time real,
  end_time real,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.video_id,
    tc.channel_id,
    tc.chunk_index,
    tc.text,
    tc.start_time,
    tc.end_time,
    1 - (tc.embedding <=> query_embedding) AS similarity
  FROM transcript_chunks tc
  WHERE 
    tc.embedding IS NOT NULL
    AND tc.embedding_status = 'completed'
    AND (filter_channel_id IS NULL OR tc.channel_id = filter_channel_id)
    AND 1 - (tc.embedding <=> query_embedding) > match_threshold
  ORDER BY tc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RPC function for user usage tracking
CREATE OR REPLACE FUNCTION get_usage_with_limits(p_user_id uuid)
RETURNS TABLE (
  plan_type text,
  messages_sent_today int,
  creators_added int,
  videos_indexed int
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reset daily count if it's a new day
  UPDATE user_usage 
  SET messages_sent_today = 0, last_message_date = CURRENT_DATE
  WHERE user_id = p_user_id AND last_message_date < CURRENT_DATE;
  
  -- Insert user if doesn't exist
  INSERT INTO user_usage (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN QUERY
  SELECT 
    uu.plan_type,
    uu.messages_sent_today,
    uu.creators_added,
    uu.videos_indexed
  FROM user_usage uu
  WHERE uu.user_id = p_user_id;
END;
$$;

-- RPC function to increment message count
CREATE OR REPLACE FUNCTION increment_message_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_usage (user_id, messages_sent_today, last_message_date)
  VALUES (p_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    messages_sent_today = CASE 
      WHEN user_usage.last_message_date < CURRENT_DATE THEN 1
      ELSE user_usage.messages_sent_today + 1
    END,
    last_message_date = CURRENT_DATE,
    updated_at = NOW();
END;
$$;

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

-- Enable Row Level Security
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_chat_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channels (public read, authenticated users can add)
CREATE POLICY "Channels are publicly readable" ON channels FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert channels" ON channels FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update their channels" ON channels FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for videos (public read)
CREATE POLICY "Videos are publicly readable" ON videos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert videos" ON videos FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for transcript_chunks (public read for RAG)
CREATE POLICY "Transcript chunks are publicly readable" ON transcript_chunks FOR SELECT USING (true);
CREATE POLICY "Service role can manage transcript chunks" ON transcript_chunks FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for chat_sessions (users can only access their own)
CREATE POLICY "Users can access their own chat sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for chat_messages (users can only access their own)
CREATE POLICY "Users can access their own chat messages" ON chat_messages 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM chat_sessions cs 
    WHERE cs.id = chat_messages.session_id 
    AND cs.user_id = auth.uid()
  )
);

-- RLS Policies for user_usage (users can only access their own)
CREATE POLICY "Users can access their own usage data" ON user_usage FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_creators (users can only access their own)
CREATE POLICY "Users can access their own creator links" ON user_creators FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for public_chat_limits (service role only)
CREATE POLICY "Service role can manage public chat limits" ON public_chat_limits FOR ALL USING (auth.role() = 'service_role');

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcript_chunks_updated_at BEFORE UPDATE ON transcript_chunks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_usage_updated_at BEFORE UPDATE ON user_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
