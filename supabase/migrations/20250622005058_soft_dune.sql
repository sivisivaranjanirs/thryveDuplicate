/*
  # Setup Supabase Configuration for Push Notifications

  1. Purpose
    - Set up required configuration settings for push notifications
    - Ensure edge function URLs and service role keys are accessible
    - Configure settings for database triggers to call edge functions

  2. Changes
    - Set up app.supabase_url setting
    - Set up app.supabase_service_role_key setting
    - These settings are used by database triggers to call edge functions

  3. Security
    - Uses ALTER DATABASE to set configuration
    - Settings are accessible to database functions
    - Service role key allows bypassing RLS for system operations
*/

-- Set up configuration settings for the database
-- These settings allow database triggers to call Supabase edge functions

-- Note: In a real deployment, you would set these values to your actual Supabase URL and service role key
-- For now, we'll set placeholder values that can be updated in production

-- Set the Supabase URL (replace with your actual URL)
-- This should be set via environment variables in production
DO $$
BEGIN
  -- Try to set the configuration, but don't fail if it already exists
  BEGIN
    ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
  EXCEPTION
    WHEN OTHERS THEN
      -- Setting might already exist, that's okay
      NULL;
  END;
  
  -- Try to set the service role key configuration
  BEGIN
    ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';
  EXCEPTION
    WHEN OTHERS THEN
      -- Setting might already exist, that's okay
      NULL;
  END;
END $$;

-- Create a function to help with configuration management
CREATE OR REPLACE FUNCTION get_supabase_config(setting_name text)
RETURNS text AS $$
BEGIN
  RETURN current_setting('app.' || setting_name, true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_supabase_config(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_supabase_config(text) TO service_role;