/*
  # Fix Reading Permission Creation

  1. Purpose
    - Restore the trigger that creates reading permissions when requests are accepted
    - Ensure user 1 can see access in "My Access" tab after user 2 accepts

  2. Changes
    - Recreate the trigger function with proper permissions
    - Add trigger to create reading permissions on request acceptance
    - Ensure notifications are sent properly

  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only creates permissions for accepted requests
*/

-- Create function to handle reading request acceptance
CREATE OR REPLACE FUNCTION create_reading_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if request was accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create one-way permission: requester can view owner's readings
    INSERT INTO reading_permissions (viewer_id, owner_id)
    VALUES (NEW.requester_id, NEW.owner_id)
    ON CONFLICT (viewer_id, owner_id) DO NOTHING;
    
    -- Create notification for requester using service role permissions
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message)
    VALUES (
      NEW.requester_id,
      NEW.owner_id,
      'reading_accepted',
      'Reading Request Accepted',
      'Your request to view health readings has been accepted!'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle request acceptance
DROP TRIGGER IF EXISTS reading_request_accepted_trigger ON reading_requests;
CREATE TRIGGER reading_request_accepted_trigger
  AFTER UPDATE ON reading_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_reading_permission();

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION create_reading_permission() TO authenticated;
GRANT EXECUTE ON FUNCTION create_reading_permission() TO service_role;