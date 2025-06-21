/*
  # Fix friend notifications constraint

  1. Problem
    - The friend_notifications table has a check constraint that's rejecting valid notification types
    - Application is trying to insert notification types that aren't allowed by the constraint

  2. Solution
    - Update the check constraint to include all valid notification types
    - Ensure the constraint matches what the application expects to use

  3. Changes
    - Drop the existing check constraint
    - Add a new check constraint with all required notification types
*/

-- Drop the existing constraint
ALTER TABLE friend_notifications DROP CONSTRAINT IF EXISTS friend_notifications_notification_type_check;

-- Add the updated constraint with all valid notification types
ALTER TABLE friend_notifications ADD CONSTRAINT friend_notifications_notification_type_check 
  CHECK (notification_type = ANY (ARRAY['health_metric'::text, 'friend_request'::text, 'friend_accepted'::text, 'reading_request'::text]));