-- Fix schema 

-- Add missing columns to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS ingestion_progress INTEGER DEFAULT 0 CHECK (ingestion_progress >= 0 AND ingestion_progress <= 100);

-- Add missing columns to videos table  
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration TEXT;

-- Update channels ingestion_status check constraint
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_ingestion_status_check;
ALTER TABLE channels ADD CONSTRAINT channels_ingestion_status_check 
  CHECK (ingestion_status IN ('pending', 'indexing', 'extracting', 'processing', 'completed', 'partial', 'failed', 'paused', 'no_captions'));

-- Ensure user_creators table exists with correct structure
CREATE TABLE IF NOT EXISTS user_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- Enable RLS on user_creators if not already enabled
ALTER TABLE user_creators ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_creators
DROP POLICY IF EXISTS "Users can access their own creator links" ON user_creators;
CREATE POLICY "Users can access their own creator links" ON user_creators FOR ALL USING (auth.uid() = user_id);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update profiles updated_at trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
