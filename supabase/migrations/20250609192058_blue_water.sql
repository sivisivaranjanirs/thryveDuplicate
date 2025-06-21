/*
  # Fix User Profile Creation Trigger

  1. Purpose
    - Fix the sync_user_email function and trigger to properly handle user profile creation
    - Update RLS policies to allow profile creation during signup
    - Handle dependency issues by dropping trigger first

  2. Changes
    - Drop trigger before dropping function to avoid dependency errors
    - Recreate improved sync_user_email function with better error handling
    - Update RLS policies to allow service role access
    - Add email column to user_profiles if it doesn't exist
*/

-- First, drop the trigger if it exists (this removes the dependency)
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS sync_user_email();

-- Add email column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email text;
  END IF;
END $$;

-- Create improved sync_user_email function
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile with email from auth.users
  INSERT INTO public.user_profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync user email to profile
CREATE TRIGGER sync_user_email_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Ensure RLS policies allow profile creation during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (auth.uid() = id OR current_setting('role') = 'service_role');

-- Update existing policy to allow service role access
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated, service_role
  USING (auth.uid() = id OR current_setting('role') = 'service_role');

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = id OR current_setting('role') = 'service_role');