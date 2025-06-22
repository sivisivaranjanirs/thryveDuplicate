/*
  # Fix notification trigger permissions

  1. Security Fix
    - Update `notify_reading_viewers_health_metric` function to use SECURITY DEFINER
    - This allows the function to bypass RLS policies for system operations
    - Fixes the 403 error when inserting health metrics

  2. Function Updates
    - Recreate the function with proper security context
    - Maintain all existing functionality
    - Ensure notifications are properly created for health metric updates
*/

-- Drop and recreate the function with SECURITY DEFINER
DROP FUNCTION IF EXISTS notify_reading_viewers_health_metric();

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
DROP TRIGGER IF EXISTS health_metric_viewer_notification_trigger ON health_metrics;

CREATE TRIGGER health_metric_viewer_notification_trigger
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION notify_reading_viewers_health_metric();