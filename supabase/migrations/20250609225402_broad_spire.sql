/*
  # Enable Friend Health Data Access

  1. Purpose
    - Allow users to view health metrics of their friends
    - Maintain privacy by only allowing access to active friends
    - Enable the friend health report feature

  2. Security
    - Users can only view health metrics of confirmed friends
    - Maintains existing user privacy for their own data
    - Uses existing friendship relationships for authorization
*/

-- Add policy to allow users to view their friends' health metrics
CREATE POLICY "Users can view friends health metrics"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own metrics (existing functionality)
    auth.uid() = user_id
    OR
    -- Users can view metrics of their active friends
    EXISTS (
      SELECT 1 FROM user_friends uf
      WHERE uf.user_id = auth.uid()
        AND uf.friend_id = health_metrics.user_id
        AND uf.status = 'active'
    )
  );

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can read own health metrics" ON health_metrics;