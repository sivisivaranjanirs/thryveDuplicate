/*
  # Fix user_friends RLS policy for mutual friendship creation

  1. Security Policy Updates
    - Update INSERT policy on `user_friends` table to allow creating friendships where either user_id or friend_id matches the authenticated user
    - This enables the database trigger to create mutual friendships when a friend request is accepted

  2. Changes Made
    - Drop existing restrictive INSERT policy
    - Create new INSERT policy that allows insertion when either user_id or friend_id matches auth.uid()
    - This allows the create_mutual_friendship trigger to work properly
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can manage their own friendships" ON user_friends;

-- Create a new INSERT policy that allows creating friendships for both directions
CREATE POLICY "Users can create mutual friendships"
  ON user_friends
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) OR (auth.uid() = friend_id)
  );

-- Keep the existing SELECT policy but make it more explicit
DROP POLICY IF EXISTS "Users can view their own friendships" ON user_friends;

CREATE POLICY "Users can view their own friendships"
  ON user_friends
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR (auth.uid() = friend_id)
  );

-- Create separate policies for UPDATE and DELETE to maintain security
CREATE POLICY "Users can update their own friendships"
  ON user_friends
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
  ON user_friends
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);