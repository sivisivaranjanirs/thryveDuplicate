/*
  # Clear All Reading Access Data

  1. Purpose
    - Clear all data from reading access tables for fresh testing
    - Remove all reading requests, permissions, and notifications
    - Preserve user profiles and health metrics

  2. Tables to Clear
    - reading_requests (all pending/accepted/declined requests)
    - reading_permissions (all granted permissions)
    - friend_notifications (all access-related notifications)

  3. Data Preservation
    - Keep user_profiles intact
    - Keep health_metrics intact
    - Keep chat data intact
*/

-- Clear all reading permissions
DELETE FROM reading_permissions;

-- Clear all reading requests  
DELETE FROM reading_requests;

-- Clear all friend notifications
DELETE FROM friend_notifications;

-- Reset sequences if they exist
DO $$
BEGIN
  -- Reset any sequences that might exist (though we use UUIDs)
  -- This is just for completeness
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'reading_permissions_id_seq') THEN
    ALTER SEQUENCE reading_permissions_id_seq RESTART WITH 1;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'reading_requests_id_seq') THEN
    ALTER SEQUENCE reading_requests_id_seq RESTART WITH 1;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'friend_notifications_id_seq') THEN
    ALTER SEQUENCE friend_notifications_id_seq RESTART WITH 1;
  END IF;
END $$;