/*
  # VidGro Database Schema Setup

  1. New Tables
    - `profiles` - User profile information with coins and VIP status
    - `videos` - Video promotions with hold system and analytics
    - `video_views` - Track user video watching history
    - `coin_transactions` - Complete transaction history
    - `user_settings` - User preferences and ad configuration

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - Secure user data isolation

  3. Functions
    - Video queue management
    - Coin transaction processing
    - Analytics calculations
    - Hold system automation
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  coins integer DEFAULT 100 NOT NULL CHECK (coins >= 0),
  is_vip boolean DEFAULT false NOT NULL,
  vip_expires_at timestamptz,
  referral_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'base64'),
  referred_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  youtube_url text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 10 AND duration_seconds <= 600),
  coin_cost integer NOT NULL CHECK (coin_cost > 0),
  coin_reward integer NOT NULL CHECK (coin_reward > 0),
  views_count integer DEFAULT 0 NOT NULL CHECK (views_count >= 0),
  target_views integer NOT NULL CHECK (target_views > 0 AND target_views <= 1000),
  status text DEFAULT 'on_hold' NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'on_hold', 'repromoted')),
  hold_until timestamptz DEFAULT (now() + interval '10 minutes'),
  total_watch_time integer DEFAULT 0,
  engagement_rate decimal(5,2) DEFAULT 0.0,
  completion_rate decimal(5,2) DEFAULT 0.0,
  average_watch_time decimal(8,2) DEFAULT 0.0,
  repromoted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create video_views table
CREATE TABLE IF NOT EXISTS video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  watched_duration integer NOT NULL CHECK (watched_duration >= 0),
  completed boolean DEFAULT false NOT NULL,
  coins_earned integer DEFAULT 0 NOT NULL CHECK (coins_earned >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(video_id, viewer_id)
);

-- Create coin_transactions table
CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('video_watch', 'video_promotion', 'purchase', 'referral_bonus', 'admin_adjustment', 'vip_purchase', 'ad_stop_purchase')),
  description text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ad_frequency integer DEFAULT 5 NOT NULL CHECK (ad_frequency >= 1 AND ad_frequency <= 20),
  auto_play boolean DEFAULT true NOT NULL,
  notifications_enabled boolean DEFAULT true NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  ad_stop_expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "System can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Videos policies
CREATE POLICY "Users can view active videos or own videos" ON videos
  FOR SELECT USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create videos" ON videos
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (user_id = auth.uid());

-- Video views policies
CREATE POLICY "Users can view own video views" ON video_views
  FOR SELECT USING (viewer_id = auth.uid());

CREATE POLICY "Users can create video views" ON video_views
  FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- Coin transactions policies
CREATE POLICY "Users can view own transactions" ON coin_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create transactions" ON coin_transactions
  FOR INSERT WITH CHECK (true);

-- User settings policies
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_queue_management ON videos(status, views_count, target_views, updated_at, created_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_video_views_realtime ON video_views(video_id, viewer_id, completed, coins_earned, created_at);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_type ON coin_transactions(user_id, transaction_type, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_coins_update ON profiles(id, coins, updated_at);
CREATE INDEX IF NOT EXISTS idx_videos_hold_release ON videos(status, hold_until) WHERE status = 'on_hold';

-- Function to calculate coins by duration
CREATE OR REPLACE FUNCTION calculate_coins_by_duration_v2(duration_seconds integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  CASE
    WHEN duration_seconds >= 540 THEN RETURN 200;
    WHEN duration_seconds >= 480 THEN RETURN 150;
    WHEN duration_seconds >= 420 THEN RETURN 130;
    WHEN duration_seconds >= 360 THEN RETURN 100;
    WHEN duration_seconds >= 300 THEN RETURN 90;
    WHEN duration_seconds >= 240 THEN RETURN 70;
    WHEN duration_seconds >= 180 THEN RETURN 55;
    WHEN duration_seconds >= 150 THEN RETURN 50;
    WHEN duration_seconds >= 120 THEN RETURN 45;
    WHEN duration_seconds >= 90 THEN RETURN 35;
    WHEN duration_seconds >= 60 THEN RETURN 25;
    WHEN duration_seconds >= 45 THEN RETURN 15;
    WHEN duration_seconds >= 35 THEN RETURN 10;
    ELSE RETURN 5;
  END CASE;
END;
$$;

-- Function to update user coins safely
CREATE OR REPLACE FUNCTION update_user_coins(
  user_uuid uuid,
  coin_amount integer,
  transaction_type_param text,
  description_param text,
  reference_uuid uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance integer;
BEGIN
  -- Get current balance
  SELECT coins INTO current_balance FROM profiles WHERE id = user_uuid;
  
  -- Check if user exists
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check for sufficient funds on debit transactions
  IF coin_amount < 0 AND current_balance + coin_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;
  
  -- Update user balance
  UPDATE profiles 
  SET coins = coins + coin_amount, updated_at = now()
  WHERE id = user_uuid;
  
  -- Record transaction
  INSERT INTO coin_transactions (user_id, amount, transaction_type, description, reference_id)
  VALUES (user_uuid, coin_amount, transaction_type_param, description_param, reference_uuid);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to get next video for user
CREATE OR REPLACE FUNCTION get_next_video_for_user_enhanced(user_uuid uuid)
RETURNS TABLE(
  video_id uuid,
  youtube_url text,
  title text,
  duration_seconds integer,
  coin_reward integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.youtube_url,
    v.title,
    v.duration_seconds,
    v.coin_reward
  FROM videos v
  WHERE v.status = 'active'
    AND v.views_count < v.target_views
    AND v.user_id != user_uuid
    AND NOT EXISTS (
      SELECT 1 FROM video_views vv 
      WHERE vv.video_id = v.id AND vv.viewer_id = user_uuid
    )
  ORDER BY v.created_at ASC
  LIMIT 10;
END;
$$;

-- Function to award coins for video completion
CREATE OR REPLACE FUNCTION award_coins_for_video_completion(
  user_uuid uuid,
  video_uuid uuid,
  watch_duration integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  video_record videos%ROWTYPE;
  required_duration integer;
  coins_to_award integer;
  result json;
BEGIN
  -- Get video details
  SELECT * INTO video_record FROM videos WHERE id = video_uuid;
  
  IF video_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video not found');
  END IF;
  
  -- Check if user already watched this video
  IF EXISTS (SELECT 1 FROM video_views WHERE video_id = video_uuid AND viewer_id = user_uuid) THEN
    RETURN json_build_object('success', false, 'error', 'Already watched');
  END IF;
  
  -- Check if user is the video owner
  IF video_record.user_id = user_uuid THEN
    RETURN json_build_object('success', false, 'error', 'Cannot watch own video');
  END IF;
  
  -- Calculate required watch duration (95% of video)
  required_duration := FLOOR(video_record.duration_seconds * 0.95);
  
  -- Check if watched enough
  IF watch_duration < required_duration THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient watch time');
  END IF;
  
  -- Check if video is still active and has views remaining
  IF video_record.status != 'active' OR video_record.views_count >= video_record.target_views THEN
    RETURN json_build_object('success', false, 'error', 'Video no longer available');
  END IF;
  
  coins_to_award := video_record.coin_reward;
  
  -- Record the view
  INSERT INTO video_views (video_id, viewer_id, watched_duration, completed, coins_earned)
  VALUES (video_uuid, user_uuid, watch_duration, true, coins_to_award);
  
  -- Award coins to user
  PERFORM update_user_coins(
    user_uuid, 
    coins_to_award, 
    'video_watch', 
    'Watched video: ' || video_record.title,
    video_uuid
  );
  
  -- Update video stats
  UPDATE videos 
  SET 
    views_count = views_count + 1,
    total_watch_time = total_watch_time + watch_duration,
    completion_rate = (
      SELECT AVG(CASE WHEN completed THEN 100.0 ELSE 0.0 END)
      FROM video_views 
      WHERE video_id = video_uuid
    ),
    average_watch_time = (
      SELECT AVG(watched_duration)
      FROM video_views 
      WHERE video_id = video_uuid
    ),
    status = CASE 
      WHEN views_count + 1 >= target_views THEN 'completed'
      ELSE status
    END,
    updated_at = now()
  WHERE id = video_uuid;
  
  result := json_build_object(
    'success', true,
    'coins_earned', coins_to_award,
    'views_remaining', video_record.target_views - video_record.views_count - 1
  );
  
  RETURN result;
END;
$$;

-- Function to create video with hold
CREATE OR REPLACE FUNCTION create_video_with_hold(
  user_uuid uuid,
  youtube_url_param text,
  title_param text,
  description_param text,
  duration_seconds_param integer,
  coin_cost_param integer,
  coin_reward_param integer,
  target_views_param integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  video_id uuid;
  user_balance integer;
BEGIN
  -- Check user balance
  SELECT coins INTO user_balance FROM profiles WHERE id = user_uuid;
  
  IF user_balance < coin_cost_param THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;
  
  -- Deduct coins from user
  PERFORM update_user_coins(
    user_uuid,
    -coin_cost_param,
    'video_promotion',
    'Promoted video: ' || title_param
  );
  
  -- Create video with hold
  INSERT INTO videos (
    user_id, youtube_url, title, description, duration_seconds,
    coin_cost, coin_reward, target_views, status, hold_until
  )
  VALUES (
    user_uuid, youtube_url_param, title_param, description_param, duration_seconds_param,
    coin_cost_param, coin_reward_param, target_views_param, 'on_hold', 
    now() + interval '10 minutes'
  )
  RETURNING id INTO video_id;
  
  RETURN video_id;
END;
$$;

-- Function to release videos from hold
CREATE OR REPLACE FUNCTION release_videos_from_hold()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  released_count integer;
BEGIN
  UPDATE videos 
  SET status = 'active', updated_at = now()
  WHERE status = 'on_hold' AND hold_until <= now();
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;

-- Function to get user analytics summary
CREATE OR REPLACE FUNCTION get_user_analytics_summary(user_uuid uuid)
RETURNS TABLE(
  total_videos_promoted integer,
  total_coins_earned integer,
  total_coins_spent integer,
  total_views_received integer,
  total_watch_time integer,
  active_videos integer,
  completed_videos integer,
  on_hold_videos integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*)::integer FROM videos WHERE user_id = user_uuid), 0),
    COALESCE((SELECT SUM(amount)::integer FROM coin_transactions WHERE user_id = user_uuid AND amount > 0), 0),
    COALESCE((SELECT ABS(SUM(amount))::integer FROM coin_transactions WHERE user_id = user_uuid AND amount < 0), 0),
    COALESCE((SELECT SUM(views_count)::integer FROM videos WHERE user_id = user_uuid), 0),
    COALESCE((SELECT SUM(total_watch_time)::integer FROM videos WHERE user_id = user_uuid), 0),
    COALESCE((SELECT COUNT(*)::integer FROM videos WHERE user_id = user_uuid AND status = 'active'), 0),
    COALESCE((SELECT COUNT(*)::integer FROM videos WHERE user_id = user_uuid AND status = 'completed'), 0),
    COALESCE((SELECT COUNT(*)::integer FROM videos WHERE user_id = user_uuid AND status = 'on_hold'), 0);
END;
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, username, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    encode(gen_random_bytes(6), 'base64')
  );
  
  -- Create user settings
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();