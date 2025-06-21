/*
  # Simplify friend_notifications RLS policy

  1. Purpose
    - Fix overly restrictive RLS policy that was blocking Access tab functionality
    - Allow service role unrestricted access for database triggers and edge functions
    - Maintain security for user-initiated operations

  2. Changes
    - Drop existing INSERT policies to avoid conflicts
    - Create simplified policy that allows service role and authorized users to insert notifications
    - Ensure database triggers can create notifications without RLS interference

  3. Security
    - Service role has unrestricted INSERT access for system operations
    - Users can only insert notifications for friends with active reading permissions
    - Maintains existing SELECT and UPDATE policies
*/

-- Drop all existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can insert notifications" ON friend_notifications;
DROP POLICY IF EXISTS "Allow notification inserts for friends with permissions" ON friend_notifications;

-- Create a simplified INSERT policy that allows:
-- 1. Service role to insert without restrictions (for database triggers)
-- 2. Users to insert notifications for friends who have active reading permissions
CREATE POLICY "Allow notification inserts for friends with permissions"
  ON friend_notifications
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    -- Service role can always insert (for database triggers and edge functions)
    current_setting('role') = 'service_role'
    OR
    -- User can insert notifications for friends who have active reading permissions
    (
      user_id IN (
        SELECT rp.viewer_id
        FROM reading_permissions rp
        WHERE rp.owner_id = auth.uid()
        AND rp.status = 'active'
      )
    )
  );