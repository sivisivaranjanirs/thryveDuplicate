/*
  # Add Email Notification Triggers

  1. Purpose
    - Add email notification functionality to reading requests and approvals
    - Integrate with send-email-notification edge function
    - Maintain existing functionality while adding email capabilities

  2. Changes
    - Update create_reading_permission function to send approval emails
    - Add email notification for new reading requests
    - Add error handling to prevent function failures if email service is down

  3. Security
    - Uses service role to call edge functions
    - Maintains existing RLS policies
    - Graceful degradation if email service unavailable
*/

-- Update the create_reading_permission function to include email notifications
CREATE OR REPLACE FUNCTION create_reading_permission()
RETURNS TRIGGER AS $$
DECLARE
  requester_email text;
  owner_email text;
  requester_name text;
  owner_name text;
BEGIN
  -- Only proceed if request was accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get user details for email
    SELECT up.email, up.full_name INTO requester_email, requester_name
    FROM user_profiles up WHERE up.id = NEW.requester_id;
    
    SELECT up.email, up.full_name INTO owner_email, owner_name
    FROM user_profiles up WHERE up.id = NEW.owner_id;
    
    -- Create one-way permission: requester can view owner's readings
    INSERT INTO reading_permissions (viewer_id, owner_id)
    VALUES (NEW.requester_id, NEW.owner_id)
    ON CONFLICT (viewer_id, owner_id) DO NOTHING;
    
    -- Create notification for requester
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message)
    VALUES (
      NEW.requester_id,
      NEW.owner_id,
      'reading_accepted',
      'Reading Request Accepted',
      'Your request to view health readings has been accepted!'
    );
    
    -- Send email notification to requester (if email addresses are available)
    IF requester_email IS NOT NULL AND owner_email IS NOT NULL THEN
      BEGIN
        -- Call the email notification edge function
        PERFORM net.http_post(
          url := current_setting('app.supabase_url') || '/functions/v1/send-email-notification',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'type', 'reading_approved',
            'to_email', requester_email,
            'to_name', requester_name,
            'from_email', owner_email,
            'from_name', owner_name
          )
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but don't fail the transaction
          RAISE LOG 'Failed to send approval email: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to send email notification for new reading requests
CREATE OR REPLACE FUNCTION notify_reading_request()
RETURNS TRIGGER AS $$
DECLARE
  requester_email text;
  owner_email text;
  requester_name text;
  owner_name text;
BEGIN
  -- Only send notification for new requests
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Get user details for email
    SELECT up.email, up.full_name INTO requester_email, requester_name
    FROM user_profiles up WHERE up.id = NEW.requester_id;
    
    SELECT up.email, up.full_name INTO owner_email, owner_name
    FROM user_profiles up WHERE up.id = NEW.owner_id;
    
    -- Send email notification to owner (if email addresses are available)
    IF requester_email IS NOT NULL AND owner_email IS NOT NULL THEN
      BEGIN
        -- Call the email notification edge function
        PERFORM net.http_post(
          url := current_setting('app.supabase_url') || '/functions/v1/send-email-notification',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'type', 'reading_request',
            'to_email', owner_email,
            'to_name', owner_name,
            'from_email', requester_email,
            'from_name', requester_name,
            'message', NEW.message
          )
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but don't fail the transaction
          RAISE LOG 'Failed to send request email: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new reading requests
DROP TRIGGER IF EXISTS reading_request_email_trigger ON reading_requests;
CREATE TRIGGER reading_request_email_trigger
  AFTER INSERT ON reading_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_reading_request();