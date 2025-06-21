/*
  # Fix friend notifications RLS policy

  1. Policy Changes
    - Update the INSERT policy on `friend_notifications` table
    - Allow service role to insert notifications (for database triggers)
    - Allow inserting notifications for friends who have active reading permissions
  
  2. Security
    - Maintains security by only allowing notifications for users with proper permissions
    - Service role can insert notifications (needed for database triggers)
    - Users can still only insert notifications for friends with active reading permissions
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON friend_notifications;

-- Create a new comprehensive INSERT policy that allows:
-- 1. Service role to insert (for database triggers)
-- 2. Users to insert notifications for friends who have active reading permissions
CREATE POLICY "Allow notification inserts for friends with permissions"
  ON friend_notifications
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    -- Service role can always insert (for database triggers)
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