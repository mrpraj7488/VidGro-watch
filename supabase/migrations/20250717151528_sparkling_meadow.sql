/*
  # Fix profiles table and user creation trigger

  1. Ensure profiles table exists with proper structure
  2. Fix the user creation trigger
  3. Add proper error handling

  This migration addresses the "relation profiles does not exist" error
  during user signup by ensuring the table and trigger are properly set up.
*/

-- Ensure the profiles table exists with all required columns
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

-- Ensure user_settings table exists
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

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;

-- Recreate policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "System can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid());

-- Improved trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_username text;
  referral_code_value text;
BEGIN
  -- Generate username from email if not provided
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1)
  );
  
  -- Generate unique referral code
  referral_code_value := encode(gen_random_bytes(6), 'base64');
  
  -- Insert profile with error handling
  BEGIN
    INSERT INTO profiles (id, email, username, referral_code)
    VALUES (
      NEW.id,
      NEW.email,
      new_username,
      referral_code_value
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Handle duplicate username by appending random suffix
      new_username := new_username || '_' || floor(random() * 1000)::text;
      referral_code_value := encode(gen_random_bytes(6), 'base64');
      
      INSERT INTO profiles (id, email, username, referral_code)
      VALUES (
        NEW.id,
        NEW.email,
        new_username,
        referral_code_value
      );
    WHEN OTHERS THEN
      -- Log error and re-raise
      RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
      RAISE;
  END;
  
  -- Create user settings with error handling
  BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the entire transaction
      RAISE LOG 'Error creating user settings for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Final error handler
    RAISE LOG 'Fatal error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

-- Drop and recreate the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

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

-- Create update triggers if they don't exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();