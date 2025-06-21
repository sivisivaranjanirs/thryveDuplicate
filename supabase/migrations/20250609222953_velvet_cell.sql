/*
  # Fix friend_notifications RLS policy for trigger insertions

  1. Problem
    - The create_mutual_friendship trigger tries to insert notifications
    - Current RLS policy only allows service_role to insert
    - Trigger runs as authenticated user, causing RLS violation

  2. Solution
    - Add policy to allow authenticated users to insert notifications for friends
    - Maintain security by only allowing insertions where the user is involved
*/

-- Add policy to allow authenticated users to insert friend notifications
-- This is needed for the create_mutual_friendship trigger to work
CREATE POLICY "Users can create notifications for friends"
  ON friend_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the authenticated user is either the friend_id (creating notification for user_id)
    -- or if they are the user_id (though this is less common in practice)
    auth.uid() = friend_id OR auth.uid() = user_id
  );