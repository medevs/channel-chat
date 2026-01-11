-- Complete Database Alignment for Production
-- Add missing admin analytics functions and final schema alignment

-- Add missing admin analytics functions and final schema alignment

-- Function to get total user count
CREATE OR REPLACE FUNCTION public.admin_get_total_users()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM auth.users
$$;

-- Function to get users active today (have sent messages today)
CREATE OR REPLACE FUNCTION public.admin_get_active_users_today()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::bigint 
  FROM public.user_usage 
  WHERE messages_sent_today > 0
    AND last_reset_at::date = CURRENT_DATE
$$;

-- Function to get users active in last 7 days
CREATE OR REPLACE FUNCTION public.admin_get_active_users_week()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::bigint 
  FROM public.chat_sessions 
  WHERE updated_at >= NOW() - INTERVAL '7 days'
$$;

-- Function to get messages sent today
CREATE OR REPLACE FUNCTION public.admin_get_messages_today()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(messages_sent_today), 0)::bigint 
  FROM public.user_usage 
  WHERE last_reset_at::date = CURRENT_DATE
$$;

-- Function to get messages sent in last 7 days
CREATE OR REPLACE FUNCTION public.admin_get_messages_week()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint 
  FROM public.chat_messages 
  WHERE created_at >= NOW() - INTERVAL '7 days'
$$;

-- Function to get messages sent in last 30 days
CREATE OR REPLACE FUNCTION public.admin_get_messages_month()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint 
  FROM public.chat_messages 
  WHERE created_at >= NOW() - INTERVAL '30 days'
$$;

-- Function to get total creators
CREATE OR REPLACE FUNCTION public.admin_get_total_creators()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.channels
$$;

-- Function to get active creators (have chat sessions in last 7 days)
CREATE OR REPLACE FUNCTION public.admin_get_active_creators()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT channel_id)::bigint 
  FROM public.chat_sessions 
  WHERE updated_at >= NOW() - INTERVAL '7 days'
$$;

-- Function to get total videos indexed
CREATE OR REPLACE FUNCTION public.admin_get_total_videos()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.videos
$$;

-- Function to get total transcript chunks (for embeddings estimate)
CREATE OR REPLACE FUNCTION public.admin_get_total_chunks()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.transcript_chunks WHERE embedding IS NOT NULL
$$;

-- Function to get users hitting free plan limits
CREATE OR REPLACE FUNCTION public.admin_get_users_at_limit()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint 
  FROM public.user_usage 
  WHERE plan_type = 'free' 
    AND (messages_sent_today >= 18 OR creators_added >= 2)
$$;

-- Function to get top creators by message count (last 7 days)
CREATE OR REPLACE FUNCTION public.admin_get_top_creators(limit_count integer DEFAULT 10)
RETURNS TABLE(channel_id text, channel_name text, message_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.channel_id,
    c.channel_name,
    COUNT(cm.id)::bigint as message_count
  FROM public.channels c
  JOIN public.chat_sessions cs ON cs.channel_id = c.channel_id
  JOIN public.chat_messages cm ON cm.session_id = cs.id
  WHERE cm.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY c.channel_id, c.channel_name
  ORDER BY message_count DESC
  LIMIT limit_count
$$;

-- Function to get daily message stats (last 7 days)
CREATE OR REPLACE FUNCTION public.admin_get_daily_messages(days integer DEFAULT 7)
RETURNS TABLE(date date, message_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    created_at::date as date,
    COUNT(*)::bigint as message_count
  FROM public.chat_messages
  WHERE created_at >= NOW() - (days || ' days')::interval
  GROUP BY created_at::date
  ORDER BY date DESC
$$;

-- Function to get plan distribution
CREATE OR REPLACE FUNCTION public.admin_get_plan_distribution()
RETURNS TABLE(plan_type text, user_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    plan_type,
    COUNT(*)::bigint as user_count
  FROM public.user_usage
  GROUP BY plan_type
  ORDER BY user_count DESC
$$;

-- Function to get recent errors (last 24 hours)
CREATE OR REPLACE FUNCTION public.admin_get_recent_errors(limit_count integer DEFAULT 20)
RETURNS TABLE(
  id uuid,
  function_name text,
  error_message text,
  error_code text,
  severity text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    function_name,
    error_message,
    error_code,
    severity,
    created_at
  FROM public.error_logs
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT limit_count
$$;

-- Function to get average messages per user
CREATE OR REPLACE FUNCTION public.admin_get_avg_messages_per_user()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ROUND(AVG(messages_sent_total)::numeric, 1), 0)
  FROM public.user_usage
  WHERE messages_sent_total > 0
$$;

-- Add missing idempotency functions
CREATE OR REPLACE FUNCTION public.check_idempotency(
  p_idempotency_key TEXT,
  p_user_id UUID,
  p_operation_type TEXT,
  p_request_hash TEXT,
  p_ttl_seconds INTEGER DEFAULT 3600
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  existing_response JSONB,
  existing_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_expires_at TIMESTAMP WITH TIME ZONE := now() + (p_ttl_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Clean up expired entries
  DELETE FROM request_idempotency WHERE expires_at < v_now;
  
  -- Check for existing request
  SELECT * INTO v_existing
  FROM request_idempotency
  WHERE idempotency_key = p_idempotency_key
  AND expires_at >= v_now;
  
  IF FOUND THEN
    RETURN QUERY SELECT true, v_existing.response_data, v_existing.status;
    RETURN;
  END IF;
  
  -- Insert new pending request
  INSERT INTO request_idempotency (idempotency_key, user_id, operation_type, request_hash, expires_at)
  VALUES (p_idempotency_key, p_user_id, p_operation_type, p_request_hash, v_expires_at)
  ON CONFLICT (idempotency_key) DO NOTHING;
  
  RETURN QUERY SELECT false, NULL::JSONB, NULL::TEXT;
END;
$$;

-- Function to complete idempotent request
CREATE OR REPLACE FUNCTION public.complete_idempotency(
  p_idempotency_key TEXT,
  p_response_data JSONB,
  p_status TEXT DEFAULT 'completed'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE request_idempotency
  SET response_data = p_response_data,
      status = p_status,
      completed_at = now()
  WHERE idempotency_key = p_idempotency_key;
END;
$$;

-- Function to decrement creator count
CREATE OR REPLACE FUNCTION public.decrement_creator_count(p_user_id uuid)
RETURNS public.user_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage public.user_usage;
BEGIN
  -- Ensure record exists
  PERFORM public.get_or_create_user_usage(p_user_id);
  
  -- Atomically decrement counter (don't go below 0)
  UPDATE public.user_usage
  SET 
    creators_added = GREATEST(0, creators_added - 1),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_usage;
  
  RETURN v_usage;
END;
$$;
