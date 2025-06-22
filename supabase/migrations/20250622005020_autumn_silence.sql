/*
  # Fix Health Metric Push Notifications

  1. Purpose
    - Update the health metric notification trigger to send push notifications
    - Ensure users receive push notifications when friends add health readings
    - Integrate with the send-push-notification edge function

  2. Changes
    - Update notify_reading_viewers_health_metric function to send push notifications
    - Add error handling to prevent trigger failures
    - Maintain existing notification database entries

  3. Security
    - Uses service role permissions for edge function calls
    - Maintains existing RLS policies
    - Graceful degradation if push service is unavailable
*/

-- Update the function to send push notifications when health metrics are added
CREATE OR REPLACE FUNCTION notify_reading_viewers_health_metric()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_email text;
  display_name text;
  viewer_record RECORD;
  notification_title text;
  notification_body text;
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
  
  -- Prepare notification content
  notification_title := 'Health Update Available';
  notification_body := format('%s added a new %s reading: %s %s', 
                             display_name,
                             replace(NEW.metric_type, '_', ' '),
                             NEW.value, 
                             NEW.unit);
  
  -- Insert notifications and send push notifications for users who have permission to view this user's readings
  FOR viewer_record IN 
    SELECT rp.viewer_id, rp.owner_id
    FROM reading_permissions rp 
    WHERE rp.owner_id = NEW.user_id 
      AND rp.status = 'active'
  LOOP
    -- Insert notification in database
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message, data)
    VALUES (
      viewer_record.viewer_id,
      NEW.user_id,
      'health_metric',
      notification_title,
      notification_body,
      jsonb_build_object(
        'metric_type', NEW.metric_type,
        'value', NEW.value,
        'unit', NEW.unit,
        'recorded_at', NEW.recorded_at,
        'user_name', display_name
      )
    );
    
    -- Send push notification (with error handling to prevent trigger failure)
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', viewer_record.viewer_id,
          'title', notification_title,
          'body', notification_body,
          'icon', '/icons/icon-192x192.png',
          'badge', '/icons/icon-72x72.png',
          'data', jsonb_build_object(
            'type', 'health_metric',
            'metric_type', NEW.metric_type,
            'friend_id', NEW.user_id,
            'friend_name', display_name,
            'url', '/#friends'
          ),
          'tag', 'health-update-' || NEW.user_id,
          'requireInteraction', false
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE LOG 'Failed to send push notification for health metric: %', SQLERRM;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so we don't need to recreate it
-- The updated function will be used automatically

-- Also update the reading request acceptance function to send push notifications
CREATE OR REPLACE FUNCTION create_reading_permission()
RETURNS TRIGGER AS $$
DECLARE
  requester_email text;
  owner_email text;
  requester_name text;
  owner_name text;
  notification_title text;
  notification_body text;
BEGIN
  -- Only proceed if request was accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get user details
    SELECT up.email, up.full_name INTO requester_email, requester_name
    FROM user_profiles up WHERE up.id = NEW.requester_id;
    
    SELECT up.email, up.full_name INTO owner_email, owner_name
    FROM user_profiles up WHERE up.id = NEW.owner_id;
    
    -- Create one-way permission: requester can view owner's readings
    INSERT INTO reading_permissions (viewer_id, owner_id)
    VALUES (NEW.requester_id, NEW.owner_id)
    ON CONFLICT (viewer_id, owner_id) DO NOTHING;
    
    -- Prepare notification content
    notification_title := 'Reading Request Accepted';
    notification_body := format('%s has accepted your request to view their health readings!', 
                               COALESCE(owner_name, split_part(owner_email, '@', 1), 'Someone'));
    
    -- Create notification for requester
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message)
    VALUES (
      NEW.requester_id,
      NEW.owner_id,
      'reading_accepted',
      notification_title,
      notification_body
    );
    
    -- Send push notification to requester (with error handling)
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', NEW.requester_id,
          'title', notification_title,
          'body', notification_body,
          'icon', '/icons/icon-192x192.png',
          'badge', '/icons/icon-72x72.png',
          'data', jsonb_build_object(
            'type', 'reading_accepted',
            'owner_id', NEW.owner_id,
            'owner_name', COALESCE(owner_name, split_part(owner_email, '@', 1), 'Someone'),
            'url', '/#friends'
          ),
          'tag', 'reading-accepted-' || NEW.owner_id,
          'requireInteraction', false
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE LOG 'Failed to send push notification for reading acceptance: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the reading request notification function
CREATE OR REPLACE FUNCTION notify_reading_request()
RETURNS TRIGGER AS $$
DECLARE
  requester_email text;
  owner_email text;
  requester_name text;
  owner_name text;
  notification_title text;
  notification_body text;
BEGIN
  -- Only send notification for new requests
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Get user details
    SELECT up.email, up.full_name INTO requester_email, requester_name
    FROM user_profiles up WHERE up.id = NEW.requester_id;
    
    SELECT up.email, up.full_name INTO owner_email, owner_name
    FROM user_profiles up WHERE up.id = NEW.owner_id;
    
    -- Prepare notification content
    notification_title := 'New Reading Request';
    notification_body := format('%s wants to view your health readings', 
                               COALESCE(requester_name, split_part(requester_email, '@', 1), 'Someone'));
    
    -- Create notification for owner
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message)
    VALUES (
      NEW.owner_id,
      NEW.requester_id,
      'reading_request',
      notification_title,
      notification_body
    );
    
    -- Send push notification to owner (with error handling)
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', NEW.owner_id,
          'title', notification_title,
          'body', notification_body,
          'icon', '/icons/icon-192x192.png',
          'badge', '/icons/icon-72x72.png',
          'data', jsonb_build_object(
            'type', 'reading_request',
            'requester_id', NEW.requester_id,
            'requester_name', COALESCE(requester_name, split_part(requester_email, '@', 1), 'Someone'),
            'url', '/#friends'
          ),
          'tag', 'reading-request-' || NEW.requester_id,
          'requireInteraction', true
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE LOG 'Failed to send push notification for reading request: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the triggers exist (they should already exist from previous migrations)
-- But let's make sure they're properly set up

DROP TRIGGER IF EXISTS health_metric_viewer_notification_trigger ON health_metrics;
CREATE TRIGGER health_metric_viewer_notification_trigger
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION notify_reading_viewers_health_metric();

DROP TRIGGER IF EXISTS reading_request_accepted_trigger ON reading_requests;
CREATE TRIGGER reading_request_accepted_trigger
  AFTER UPDATE ON reading_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_reading_permission();

DROP TRIGGER IF EXISTS reading_request_email_trigger ON reading_requests;
CREATE TRIGGER reading_request_email_trigger
  AFTER INSERT ON reading_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_reading_request();