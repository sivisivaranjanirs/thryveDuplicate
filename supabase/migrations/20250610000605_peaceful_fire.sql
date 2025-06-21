/*
  # Update User Profiles RLS Policy for Reading Permissions

  1. Purpose
    - Update the RLS policy on user_profiles to work with the new reading permissions system
    - Allow users to read profiles of people they have reading access to
    - Enable proper name/email display in the "My Access" tab

  2. Changes
    - Drop the existing restrictive SELECT policy on user_profiles
    - Create a comprehensive policy that allows reading friend profiles through reading_permissions
    - Allow reading profiles involved in reading_requests for proper request display

  3. Security
    - Maintains user privacy by only allowing access through established relationships
    - Uses the new reading_permissions and reading_requests tables for access control
    - Preserves service role access for system operations
*/

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can read own and friend profiles" ON user_profiles;

-- Create a comprehensive SELECT policy that works with reading permissions
CREATE POLICY "Users can read profiles with reading access"
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
    -- Allow users to read profiles of people whose data they can view (reading permissions)
    EXISTS (
      SELECT 1 FROM reading_permissions rp
      WHERE rp.viewer_id = auth.uid()
        AND rp.owner_id = user_profiles.id
        AND rp.status = 'active'
    )
    OR
    -- Allow users to read profiles of people who have granted them access
    EXISTS (
      SELECT 1 FROM reading_permissions rp
      WHERE rp.owner_id = auth.uid()
        AND rp.viewer_id = user_profiles.id
        AND rp.status = 'active'
    )
    OR
    -- Allow users to read profiles of people they have sent reading requests to
    EXISTS (
      SELECT 1 FROM reading_requests rr
      WHERE rr.requester_id = auth.uid()
        AND rr.owner_id = user_profiles.id
        AND rr.status = 'pending'
    )
    OR
    -- Allow users to read profiles of people who have sent them reading requests
    EXISTS (
      SELECT 1 FROM reading_requests rr
      WHERE rr.owner_id = auth.uid()
        AND rr.requester_id = user_profiles.id
        AND rr.status = 'pending'
    )
  );

-- Create indexes to optimize the policy queries
CREATE INDEX IF NOT EXISTS idx_reading_permissions_viewer_owner_active 
  ON reading_permissions(viewer_id, owner_id) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_reading_permissions_owner_viewer_active 
  ON reading_permissions(owner_id, viewer_id) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_reading_requests_requester_owner_pending 
  ON reading_requests(requester_id, owner_id) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reading_requests_owner_requester_pending 
  ON reading_requests(owner_id, requester_id) 
  WHERE status = 'pending';