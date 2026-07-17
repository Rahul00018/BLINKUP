-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channels the platform admin allows (optional whitelist)
CREATE TABLE channels (
  id TEXT PRIMARY KEY,              -- YouTube channelId
  name TEXT NOT NULL,
  handle TEXT,
  description TEXT,
  thumbnail_url TEXT,
  banner_url TEXT,
  subscriber_count BIGINT,
  video_count INT,
  last_synced_at TIMESTAMPTZ
);

-- User subscriptions to channels
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- Watch history
CREATE TABLE watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  progress_seconds INT DEFAULT 0,
  duration_seconds INT DEFAULT 0
);

-- Saved / Liked videos
CREATE TABLE saved_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own history" ON watch_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own saved" ON saved_videos FOR ALL USING (auth.uid() = user_id);

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, onboarding_complete)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    FALSE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
