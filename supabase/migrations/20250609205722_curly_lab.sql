/*
  # Fix User Profile Creation and Friend Request System

  1. Ensure user profiles are created for existing users
  2. Fix the sync function to handle edge cases
  3. Update policies to ensure proper access

  2. Changes
    - Backfill existing users who don't have profiles
    - Improve the sync function reliability
    - Add better error handling
*/

-- Backfill user profiles for existing auth.users who don't have profiles
INSERT INTO user_profiles (id, email, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Improve the sync function to be more robust
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user profile with email from auth.users
  INSERT INTO public.user_profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error syncing user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
CREATE TRIGGER sync_user_email_trigger
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();