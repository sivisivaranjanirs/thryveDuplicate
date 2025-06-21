/*
  # Fix Friend Health Report Access

  1. Purpose
    - Fix the RLS policy for health_metrics to properly allow friend access
    - Ensure the policy name doesn't conflict with existing policies
    - Add proper debugging and error handling

  2. Changes
    - Drop existing conflicting policies
    - Create a comprehensive policy that allows both own and friend access
    - Add indexes for better performance
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can read own health metrics" ON health_metrics;
DROP POLICY IF EXISTS "Users can view friends health metrics" ON health_metrics;

-- Create a comprehensive policy for reading health metrics
CREATE POLICY "Users can view own and friends health metrics"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own metrics
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

-- Ensure the user_friends table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_friends_lookup ON user_friends(user_id, friend_id, status);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_lookup ON health_metrics(user_id, recorded_at);