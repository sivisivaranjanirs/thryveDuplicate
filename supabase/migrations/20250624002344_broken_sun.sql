/*
  # Fix Health Metric Notification Function

  1. Changes
    - Drop trigger first to remove dependency
    - Drop and recreate function with SECURITY DEFINER
    - Recreate trigger with proper linkage

  2. Security
    - Function runs with elevated privileges to access user profiles
    - Maintains RLS on all table operations
*/

-- Drop the trigger first to remove dependency on the function
DROP TRIGGER IF EXISTS health_metric_viewer_notification_trigger ON health_metrics;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS notify_reading_viewers_health_metric();

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION notify_reading_viewers_health_metric()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_email text;
  display_name text;
BEGIN
  -- Get user's display name
  SELECT up.full_name, up.email 
  INTO user_name, user_email
  FROM user_profiles up 
  WHERE up.id = NEW.user_id;
  
  -- Determine display name
  IF user_name IS NOT NULL AND user_name != '' THEN
    display_name := user_name;
  ELSIF user_email IS NOT NULL THEN
    display_name := split_part(user_email, '@', 1);
  ELSE
    display_name := 'Someone';
  END IF;
  
  -- Create notifications for viewers with reading permissions
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's properly linked
CREATE TRIGGER health_metric_viewer_notification_trigger
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION notify_reading_viewers_health_metric();