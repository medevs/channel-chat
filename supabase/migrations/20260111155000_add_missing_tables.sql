-- Create user_creators table (many-to-many: users ↔ channels)
CREATE TABLE IF NOT EXISTS public.user_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Enable RLS on user_creators
ALTER TABLE public.user_creators ENABLE ROW LEVEL SECURITY;

-- User_creators policies: users can only manage their own creator links
DROP POLICY IF EXISTS "Users can view their own creator links" ON public.user_creators;
DROP POLICY IF EXISTS "Users can add creators to their list" ON public.user_creators;
DROP POLICY IF EXISTS "Users can remove creators from their list" ON public.user_creators;

CREATE POLICY "Users can view their own creator links" ON public.user_creators
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add creators to their list" ON public.user_creators
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove creators from their list" ON public.user_creators
  FOR DELETE USING (auth.uid() = user_id);

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can only manage their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
