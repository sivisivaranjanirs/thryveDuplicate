/*
  # Fix notification type constraint

  1. Changes
    - Update the friend_notifications_notification_type_check constraint to include 'reading_accepted'
    - This allows the notification system to properly handle reading request acceptance notifications

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop the existing constraint
ALTER TABLE friend_notifications DROP CONSTRAINT IF EXISTS friend_notifications_notification_type_check;

-- Add the updated constraint with 'reading_accepted' included
ALTER TABLE friend_notifications ADD CONSTRAINT friend_notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY['health_metric'::text, 'friend_request'::text, 'friend_accepted'::text, 'reading_request'::text, 'reading_accepted'::text]));