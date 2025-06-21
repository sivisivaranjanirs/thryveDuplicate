/*
  # Debug Friend Health Access Issues

  1. Purpose
    - Add debugging function to check friend relationships
    - Simplify RLS policies to avoid conflicts
    - Add performance indexes

  2. Changes
    - Create debug function to verify friend access
    - Recreate health metrics policies with better logic
    - Add composite indexes for better performance
*/

-- Create a debug function to check friend relationships
CREATE OR REPLACE FUNCTION debug_friend_access(friend_user_id uuid)
RETURNS TABLE(
  current_user_id uuid,
  target_friend_id uuid,
  friendship_exists boolean,
  friendship_status text,
  can_access_metrics boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    friend_user_id as target_friend_id,
    EXISTS(
      SELECT 1 FROM user_friends uf 
      WHERE uf.user_id = auth.uid() 
        AND uf.friend_id = friend_user_id
    ) as friendship_exists,
    COALESCE(
      (SELECT uf.status FROM user_friends uf 
       WHERE uf.user_id = auth.uid() 
         AND uf.friend_id = friend_user_id 
       LIMIT 1), 
      'none'
    ) as friendship_status,
    EXISTS(
      SELECT 1 FROM user_friends uf 
      WHERE uf.user_id = auth.uid() 
        AND uf.friend_id = friend_user_id 
        AND uf.status = 'active'
    ) as can_access_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_friend_access(uuid) TO authenticated;

-- Drop all existing health_metrics policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own health metrics" ON health_metrics;
DROP POLICY IF EXISTS "Users can view friends health metrics" ON health_metrics;
DROP POLICY IF EXISTS "Users can view own and friends health metrics" ON health_metrics;

-- Create a single, clear policy for health metrics access
CREATE POLICY "Health metrics access policy"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (
    -- Allow access to own metrics
    user_id = auth.uid()
    OR
    -- Allow access to active friends' metrics
    user_id IN (
      SELECT uf.friend_id 
      FROM user_friends uf 
      WHERE uf.user_id = auth.uid() 
        AND uf.status = 'active'
    )
  );

-- Ensure we have the right indexes for performance
DROP INDEX IF EXISTS idx_user_friends_lookup;
DROP INDEX IF EXISTS idx_health_metrics_user_lookup;

CREATE INDEX IF NOT EXISTS idx_user_friends_active_lookup 
  ON user_friends(user_id, friend_id) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_health_metrics_user_recorded 
  ON health_metrics(user_id, recorded_at DESC);

-- Add a function to get friend health metrics count (for debugging)
CREATE OR REPLACE FUNCTION get_friend_metrics_count(friend_user_id uuid)
RETURNS integer AS $$
DECLARE
  metric_count integer;
BEGIN
  -- Check if friendship exists and is active
  IF NOT EXISTS(
    SELECT 1 FROM user_friends 
    WHERE user_id = auth.uid() 
      AND friend_id = friend_user_id 
      AND status = 'active'
  ) THEN
    RETURN -1; -- Indicates no friendship
  END IF;
  
  -- Count metrics
  SELECT COUNT(*) INTO metric_count
  FROM health_metrics 
  WHERE user_id = friend_user_id;
  
  RETURN metric_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_friend_metrics_count(uuid) TO authenticated;