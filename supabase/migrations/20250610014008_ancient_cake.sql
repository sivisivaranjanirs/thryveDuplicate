/*
  # Remove conflicting notification trigger

  1. Changes
    - Remove the `reading_request_accepted_trigger` trigger that conflicts with RLS
    - The notification logic is already handled by the edge function with proper service role permissions
    
  2. Security
    - This resolves the RLS policy violation when accepting reading requests
    - Notifications will continue to work via the edge function approach
*/

-- Remove the conflicting trigger that tries to insert notifications
-- This trigger conflicts with RLS policies since it runs with user privileges
-- instead of service role privileges
DROP TRIGGER IF EXISTS reading_request_accepted_trigger ON reading_requests;

-- Note: Notifications are handled by the send-friend-notification edge function
-- which has proper service role permissions to bypass RLS