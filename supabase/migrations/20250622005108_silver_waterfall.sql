/*
  # Simple Push Notification Approach

  1. Purpose
    - Simplify push notification delivery by using a queue-based approach
    - Create a notification queue table that can be processed by edge functions
    - Avoid complex database trigger configurations

  2. Changes
    - Create notification_queue table for pending push notifications
    - Update triggers to insert into queue instead of calling edge functions directly
    - Edge functions can process the queue periodically

  3. Security
    - Uses existing RLS policies
    - Queue processing happens via edge functions with proper permissions
    - Maintains data integrity and security
*/

-- Create notification queue table for push notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS on notification queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage queue
CREATE POLICY "Service role can manage notification queue"
  ON notification_queue
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at);

-- Update the health metric notification function to use the queue
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
  
  -- Process each viewer who has permission to view this user's readings
  FOR viewer_record IN 
    SELECT rp.viewer_id, rp.owner_id
    FROM reading_permissions rp 
    WHERE rp.owner_id = NEW.user_id 
      AND rp.status = 'active'
  LOOP
    -- Insert notification in database (for in-app notifications)
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
    
    -- Queue push notification for processing
    INSERT INTO notification_queue (user_id, notification_type, title, body, data)
    VALUES (
      viewer_record.viewer_id,
      'health_metric',
      notification_title,
      notification_body,
      jsonb_build_object(
        'type', 'health_metric',
        'metric_type', NEW.metric_type,
        'friend_id', NEW.user_id,
        'friend_name', display_name,
        'url', '/#friends',
        'icon', '/icons/icon-192x192.png',
        'badge', '/icons/icon-72x72.png',
        'tag', 'health-update-' || NEW.user_id,
        'requireInteraction', false
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update reading request acceptance function to use queue
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
    
    -- Create notification for requester (in-app)
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message)
    VALUES (
      NEW.requester_id,
      NEW.owner_id,
      'reading_accepted',
      notification_title,
      notification_body
    );
    
    -- Queue push notification
    INSERT INTO notification_queue (user_id, notification_type, title, body, data)
    VALUES (
      NEW.requester_id,
      'reading_accepted',
      notification_title,
      notification_body,
      jsonb_build_object(
        'type', 'reading_accepted',
        'owner_id', NEW.owner_id,
        'owner_name', COALESCE(owner_name, split_part(owner_email, '@', 1), 'Someone'),
        'url', '/#friends',
        'icon', '/icons/icon-192x192.png',
        'badge', '/icons/icon-72x72.png',
        'tag', 'reading-accepted-' || NEW.owner_id,
        'requireInteraction', false
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reading request notification function to use queue
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
    
    -- Create notification for owner (in-app)
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message)
    VALUES (
      NEW.owner_id,
      NEW.requester_id,
      'reading_request',
      notification_title,
      notification_body
    );
    
    -- Queue push notification
    INSERT INTO notification_queue (user_id, notification_type, title, body, data)
    VALUES (
      NEW.owner_id,
      'reading_request',
      notification_title,
      notification_body,
      jsonb_build_object(
        'type', 'reading_request',
        'requester_id', NEW.requester_id,
        'requester_name', COALESCE(requester_name, split_part(requester_email, '@', 1), 'Someone'),
        'url', '/#friends',
        'icon', '/icons/icon-192x192.png',
        'badge', '/icons/icon-72x72.png',
        'tag', 'reading-request-' || NEW.requester_id,
        'requireInteraction', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to process notification queue (called by edge function)
CREATE OR REPLACE FUNCTION process_notification_queue(batch_size integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  notification_type text,
  title text,
  body text,
  data jsonb
) AS $$
BEGIN
  RETURN QUERY
  UPDATE notification_queue 
  SET status = 'sent', processed_at = now()
  WHERE notification_queue.id IN (
    SELECT notification_queue.id 
    FROM notification_queue 
    WHERE status = 'pending' 
    ORDER BY created_at ASC 
    LIMIT batch_size
  )
  RETURNING 
    notification_queue.id,
    notification_queue.user_id,
    notification_queue.notification_type,
    notification_queue.title,
    notification_queue.body,
    notification_queue.data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION process_notification_queue(integer) TO service_role;