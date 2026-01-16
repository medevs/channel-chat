-- Drop existing functions that have wrong signatures
DROP FUNCTION IF EXISTS public.get_usage_with_limits(UUID);
DROP FUNCTION IF EXISTS public.reset_daily_usage_if_needed(UUID);
DROP FUNCTION IF EXISTS public.get_or_create_user_usage(UUID);
DROP FUNCTION IF EXISTS public.increment_creator_count(UUID);
DROP FUNCTION IF EXISTS public.increment_videos_indexed(UUID, INTEGER);

-- Recreate with correct signatures

-- Create helper function to auto-create user_usage
CREATE OR REPLACE FUNCTION public.get_or_create_user_usage(p_user_id UUID)
RETURNS public.user_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage public.user_usage;
BEGIN
  SELECT * INTO v_usage FROM public.user_usage WHERE user_id = p_user_id;
  
  IF v_usage IS NULL THEN
    INSERT INTO public.user_usage (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_usage;
  END IF;
  
  RETURN v_usage;
END;
$$;

-- Create function to reset daily counters
CREATE OR REPLACE FUNCTION public.reset_daily_usage_if_needed(p_user_id UUID)
RETURNS public.user_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage public.user_usage;
  v_today DATE := CURRENT_DATE;
BEGIN
  PERFORM public.get_or_create_user_usage(p_user_id);
  
  UPDATE public.user_usage
  SET 
    messages_sent_today = 0,
    last_reset_at = v_today::TIMESTAMP WITH TIME ZONE,
    updated_at = now()
  WHERE user_id = p_user_id
    AND last_reset_at::DATE < v_today;
  
  SELECT * INTO v_usage FROM public.user_usage WHERE user_id = p_user_id;
  RETURN v_usage;
END;
$$;

-- Fix get_usage_with_limits to handle NULL user_id properly
CREATE OR REPLACE FUNCTION public.get_usage_with_limits(p_user_id UUID)
RETURNS TABLE(
  plan_type TEXT,
  creators_added INTEGER,
  videos_indexed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle NULL user_id case - return default values for anonymous users
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT 
      'free'::TEXT,
      0::INTEGER,
      0::INTEGER;
    RETURN;
  END IF;

  -- Reset daily counter if needed and return current usage
  PERFORM public.reset_daily_usage_if_needed(p_user_id);
  
  RETURN QUERY
  SELECT 
    u.plan_type,
    u.creators_added,
    u.videos_indexed
  FROM public.user_usage u
  WHERE u.user_id = p_user_id;
END;
$$;

-- Create increment functions
CREATE OR REPLACE FUNCTION public.increment_creator_count(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.get_or_create_user_usage(p_user_id);
  
  UPDATE public.user_usage
  SET 
    creators_added = creators_added + 1,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_videos_indexed(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.get_or_create_user_usage(p_user_id);
  
  UPDATE public.user_usage
  SET 
    videos_indexed = videos_indexed + p_count,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;
