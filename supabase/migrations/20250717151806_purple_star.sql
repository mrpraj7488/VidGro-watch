/*
  # Fix pgcrypto extension and referral code generation

  1. Extensions
    - Enable pgcrypto extension for gen_random_bytes function
    - Ensure uuid-ossp extension is enabled

  2. Alternative referral code generation
    - Create fallback function for referral code generation
    - Update trigger to use more reliable method

  3. Security
    - Maintain existing RLS policies
    - Ensure proper error handling
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a more reliable referral code generation function
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Update the user creation trigger with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_username text;
  referral_code_value text;
  attempt_count integer := 0;
BEGIN
  -- Generate username from email if not provided
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1)
  );
  
  -- Generate unique referral code using our custom function
  referral_code_value := generate_referral_code();
  
  -- Insert profile with retry logic for username conflicts
  LOOP
    BEGIN
      INSERT INTO profiles (id, email, username, referral_code)
      VALUES (
        NEW.id,
        NEW.email,
        new_username,
        referral_code_value
      );
      
      -- If successful, exit the loop
      EXIT;
      
    EXCEPTION
      WHEN unique_violation THEN
        attempt_count := attempt_count + 1;
        
        -- If it's a username conflict, modify username and try again
        IF attempt_count < 5 THEN
          new_username := COALESCE(
            NEW.raw_user_meta_data->>'username', 
            split_part(NEW.email, '@', 1)
          ) || '_' || attempt_count::text;
          referral_code_value := generate_referral_code();
        ELSE
          -- After 5 attempts, give up and raise error
          RAISE EXCEPTION 'Unable to create unique username after % attempts', attempt_count;
        END IF;
        
      WHEN OTHERS THEN
        -- Log error and re-raise for any other issues
        RAISE LOG 'Error creating profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
        RAISE;
    END;
  END LOOP;
  
  -- Create user settings with error handling
  BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the entire transaction
      RAISE LOG 'Error creating user settings for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Final error handler
    RAISE LOG 'Fatal error in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing profiles that might have invalid referral codes
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id FROM profiles WHERE referral_code IS NULL OR referral_code = ''
  LOOP
    UPDATE profiles 
    SET referral_code = generate_referral_code()
    WHERE id = profile_record.id;
  END LOOP;
END $$;