/*
  # Fix GROUP BY clause in process_notification_queue function

  1. Database Functions
    - Update `process_notification_queue` function to fix GROUP BY clause error
    - Remove `nq.created_at` from SELECT or add it to GROUP BY clause

  2. Changes
    - Fix SQL aggregation query that was causing the PostgreSQL error
    - Ensure all non-aggregate columns are included in GROUP BY clause
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS process_notification_queue();

-- Recreate the function with fixed GROUP BY clause
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  notification_type text,
  title text,
  body text,
  data jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get pending notifications (limit to 100 to avoid overwhelming)
  RETURN QUERY
  SELECT 
    nq.id,
    nq.user_id,
    nq.notification_type,
    nq.title,
    nq.body,
    nq.data
  FROM notification_queue nq
  WHERE nq.status = 'pending'
    AND nq.attempts < 3
  ORDER BY nq.created_at ASC
  LIMIT 100;

  -- Mark these notifications as being processed
  UPDATE notification_queue 
  SET 
    status = 'sent',
    processed_at = now(),
    attempts = attempts + 1
  WHERE id IN (
    SELECT nq.id
    FROM notification_queue nq
    WHERE nq.status = 'pending'
      AND nq.attempts < 3
    ORDER BY nq.created_at ASC
    LIMIT 100
  );
END;
$$;