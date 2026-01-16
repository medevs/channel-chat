-- Consolidated Database Schema Redesign
-- Handles existing objects gracefully and applies all improvements

-- 1. Add missing columns to existing tables

-- Add missing columns to user_usage
ALTER TABLE public.user_usage 
ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS messages_sent_total BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT CURRENT_DATE;

-- Add missing columns to chat_sessions
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add missing columns to error_logs (if they don't exist)
ALTER TABLE public.error_logs 
ADD COLUMN IF NOT EXISTS function_name TEXT,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS error_stack TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS request_data JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'error';

-- 2. Create missing tables

-- Create transcripts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL UNIQUE REFERENCES public.videos(video_id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES public.channels(channel_id) ON DELETE CASCADE,
  full_text TEXT,
  segments JSONB DEFAULT '[]'::jsonb,
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'completed', 'no_captions', 'failed')),
  error_message TEXT,
  source_type TEXT NOT NULL DEFAULT 'caption' CHECK (source_type IN ('caption', 'none')),
  confidence REAL,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create saved_answers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.saved_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES public.channels(channel_id) ON DELETE CASCADE,
  chat_session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create operation_locks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.operation_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lock_key TEXT NOT NULL UNIQUE,
  user_id UUID,
  operation_type TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create request_idempotency table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.request_idempotency (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  user_id UUID,
  operation_type TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create user_roles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable RLS on new tables
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Add missing indexes (all conditional)
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON public.videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_extraction_status ON public.transcripts(extraction_status);
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_video_id ON public.transcript_chunks(video_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_channel_id ON public.chat_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_operation_locks_key ON public.operation_locks(lock_key);
CREATE INDEX IF NOT EXISTS idx_operation_locks_expires ON public.operation_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_request_idempotency_key ON public.request_idempotency(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_request_idempotency_expires ON public.request_idempotency(expires_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_function ON public.error_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transcripts_pending 
ON public.transcripts(video_id) 
WHERE extraction_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_transcript_chunks_completed 
ON public.transcript_chunks(channel_id, video_id) 
WHERE embedding_status = 'completed' AND embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_usage_free_limits 
ON public.user_usage(user_id, messages_sent_today, creators_added) 
WHERE plan_type = 'free';

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created 
ON public.chat_messages(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_videos_channel_published 
ON public.videos(channel_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_answers_user_created 
ON public.saved_answers(user_id, created_at DESC);

-- 5. Update existing data
UPDATE public.user_usage 
SET last_reset_at = CURRENT_DATE 
WHERE last_reset_at IS NULL;

-- 6. Create essential functions

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to reset daily usage if needed
CREATE OR REPLACE FUNCTION public.reset_daily_usage_if_needed(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_usage 
  SET messages_sent_today = 0, 
      last_reset_at = CURRENT_DATE
  WHERE user_id = p_user_id 
  AND last_reset_at::date < CURRENT_DATE;
END;
$$;

-- Update increment_message_count to use new fields
CREATE OR REPLACE FUNCTION public.increment_message_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_usage (user_id, messages_sent_today, messages_sent_total, last_reset_at)
  VALUES (p_user_id, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    messages_sent_today = CASE 
      WHEN user_usage.last_reset_at::date < CURRENT_DATE THEN 1
      ELSE user_usage.messages_sent_today + 1
    END,
    messages_sent_total = COALESCE(user_usage.messages_sent_total, 0) + 1,
    last_reset_at = CURRENT_DATE,
    updated_at = NOW();
END;
$$;

-- Function to acquire a lock
CREATE OR REPLACE FUNCTION public.acquire_operation_lock(
  p_lock_key TEXT,
  p_user_id UUID,
  p_operation_type TEXT,
  p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_expires_at TIMESTAMP WITH TIME ZONE := now() + (p_ttl_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Delete expired locks first
  DELETE FROM operation_locks WHERE expires_at < v_now;
  
  -- Try to insert new lock
  INSERT INTO operation_locks (lock_key, user_id, operation_type, expires_at)
  VALUES (p_lock_key, p_user_id, p_operation_type, v_expires_at)
  ON CONFLICT (lock_key) DO NOTHING;
  
  -- Check if we got the lock
  RETURN EXISTS (
    SELECT 1 FROM operation_locks 
    WHERE lock_key = p_lock_key 
    AND (user_id = p_user_id OR user_id IS NULL)
    AND started_at >= v_now - INTERVAL '1 second'
  );
END;
$$;

-- Function to release a lock
CREATE OR REPLACE FUNCTION public.release_operation_lock(
  p_lock_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM operation_locks WHERE lock_key = p_lock_key;
END;
$$;

-- Function to log errors
CREATE OR REPLACE FUNCTION public.log_error(
  p_function_name TEXT,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_error_stack TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_request_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'error'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO error_logs (function_name, error_message, error_code, error_stack, user_id, request_data, metadata, severity)
  VALUES (p_function_name, p_error_message, p_error_code, p_error_stack, p_user_id, p_request_data, p_metadata, p_severity)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;
