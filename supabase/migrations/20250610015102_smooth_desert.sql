/*
  # Debug Reading Permissions Issue

  1. Check if reading permissions are being created properly
  2. Add debugging function to check permission creation
  3. Ensure the trigger is working correctly
*/

-- First, let's check if there are any reading permissions at all
-- This is a debugging query - remove after fixing

-- Create a function to debug reading permission creation
CREATE OR REPLACE FUNCTION debug_reading_permission_creation()
RETURNS TABLE (
  permission_count bigint,
  request_count bigint,
  accepted_request_count bigint
) AS $$
BEGIN
  SELECT COUNT(*) INTO permission_count FROM reading_permissions;
  SELECT COUNT(*) INTO request_count FROM reading_requests;
  SELECT COUNT(*) INTO accepted_request_count FROM reading_requests WHERE status = 'accepted';
  
  RETURN QUERY SELECT permission_count, request_count, accepted_request_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Let's also check the trigger function that creates reading permissions
-- Make sure it's working correctly
CREATE OR REPLACE FUNCTION create_reading_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create permission when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Insert the reading permission
    INSERT INTO reading_permissions (viewer_id, owner_id, status)
    VALUES (NEW.requester_id, NEW.owner_id, 'active')
    ON CONFLICT (viewer_id, owner_id) 
    DO UPDATE SET 
      status = 'active',
      updated_at = now();
      
    -- Log for debugging
    RAISE NOTICE 'Created reading permission: viewer_id=%, owner_id=%', NEW.requester_id, NEW.owner_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS reading_request_accepted_trigger ON reading_requests;
CREATE TRIGGER reading_request_accepted_trigger
  AFTER UPDATE ON reading_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_reading_permission();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION debug_reading_permission_creation() TO authenticated;
GRANT EXECUTE ON FUNCTION create_reading_permission() TO authenticated;