/*
  # Fix User Profiles RLS Policy for Friends

  1. Purpose
    - Update RLS policy on user_profiles to allow reading friend profiles
    - Enable proper display of friend names and emails in the UI
    - Maintain security while allowing necessary data access

  2. Changes
    - Drop existing restrictive SELECT policy on user_profiles
    - Create new policy that allows reading:
      - Own profile
      - Profiles of active friends
      - Profiles of users in pending friend requests (sent or received)

  3. Security
    - Maintains data privacy by only allowing access to profiles of connected users
    - Uses proper joins to ensure only legitimate relationships grant access
*/

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

-- Create a comprehensive SELECT policy that allows reading friend profiles
CREATE POLICY "Users can read own and friend profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated, service_role
  USING (
    -- Allow service role full access
    current_setting('role') = 'service_role'
    OR
    -- Allow users to read their own profile
    auth.uid() = id
    OR
    -- Allow users to read profiles of their active friends
    EXISTS (
      SELECT 1 FROM user_friends uf
      WHERE uf.user_id = auth.uid()
        AND uf.friend_id = user_profiles.id
        AND uf.status = 'active'
    )
    OR
    -- Allow users to read profiles of people they are friends with (reverse direction)
    EXISTS (
      SELECT 1 FROM user_friends uf
      WHERE uf.friend_id = auth.uid()
        AND uf.user_id = user_profiles.id
        AND uf.status = 'active'
    )
    OR
    -- Allow users to read profiles of people they have sent friend requests to
    EXISTS (
      SELECT 1 FROM friend_requests fr
      WHERE fr.sender_id = auth.uid()
        AND fr.receiver_id = user_profiles.id
        AND fr.status = 'pending'
    )
    OR
    -- Allow users to read profiles of people who have sent them friend requests
    EXISTS (
      SELECT 1 FROM friend_requests fr
      WHERE fr.receiver_id = auth.uid()
        AND fr.sender_id = user_profiles.id
        AND fr.status = 'pending'
    )
  );