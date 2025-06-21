/*
  # Fix friend_notifications RLS Policy

  1. Security Fix
    - Remove overly permissive RLS policy that allows users to insert notifications for friends
    - Keep only the service role policy for system-generated notifications
    - Maintain existing SELECT and UPDATE policies for users to view/manage their own notifications

  2. Changes
    - Drop "Users can create notifications for friends" policy
    - Keep "Service role can insert notifications" policy
    - This ensures notifications are only created by the system (triggers, edge functions)
*/

-- Drop the overly permissive policy that allows users to insert notifications for friends
DROP POLICY IF EXISTS "Users can create notifications for friends" ON friend_notifications;

-- The following policies remain unchanged and are correct:
-- - "Users can view their own notifications" (SELECT)
-- - "Users can update their own notifications" (UPDATE) 
-- - "Service role can insert notifications" (INSERT for service_role)

-- This ensures that:
-- 1. Only the system (service role) can create notifications via triggers/edge functions
-- 2. Users can only view and update their own notifications
-- 3. No user can directly insert notifications for other users