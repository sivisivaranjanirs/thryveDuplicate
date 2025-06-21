/*
  # Add user name to health metric notifications

  1. Purpose
    - Update the health metric notification trigger to include the user's name
    - Make notifications more personal and informative
    - Show who added the reading in the notification message

  2. Changes
    - Update notify_reading_viewers_health_metric function to fetch and include user name
    - Improve notification message format to include the person's name
    - Handle cases where user name might not be available (fallback to email)

  3. Security
    - Maintains existing RLS policies
    - Uses existing user_profiles table for name lookup
    - No changes to access permissions
*/

-- Update the function to include user name in health metric notifications
CREATE OR REPLACE FUNCTION notify_reading_viewers_health_metric()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_email text;
  display_name text;
BEGIN
  -- Get the user's name and email from user_profiles
  SELECT up.full_name, up.email 
  INTO user_name, user_email
  FROM user_profiles up 
  WHERE up.id = NEW.user_id;
  
  -- Determine display name (prefer full_name, fallback to email prefix)
  IF user_name IS NOT NULL AND user_name != '' THEN
    display_name := user_name;
  ELSIF user_email IS NOT NULL THEN
    display_name := split_part(user_email, '@', 1);
  ELSE
    display_name := 'Someone';
  END IF;
  
  -- Insert notifications for users who have permission to view this user's readings
  INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message, data)
  SELECT 
    rp.viewer_id as user_id,
    NEW.user_id as friend_id,
    'health_metric' as notification_type,
    'Health Update Available' as title,
    format('%s added a new %s reading: %s %s', 
           display_name,
           replace(NEW.metric_type, '_', ' '),
           NEW.value, 
           NEW.unit
    ) as message,
    jsonb_build_object(
      'metric_type', NEW.metric_type,
      'value', NEW.value,
      'unit', NEW.unit,
      'recorded_at', NEW.recorded_at,
      'user_name', display_name
    ) as data
  FROM reading_permissions rp
  WHERE rp.owner_id = NEW.user_id 
    AND rp.status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so we don't need to recreate it
-- The updated function will be used automatically