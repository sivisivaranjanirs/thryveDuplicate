/*
  # Create process_notification_queue function

  1. Purpose
    - Drop existing function if it exists to avoid return type conflicts
    - Create function to process notification queue in batches
    - Handle concurrent processing with proper locking

  2. Function Features
    - Processes notifications in batches
    - Updates status from 'pending' to 'processing'
    - Implements retry logic (max 3 attempts)
    - Uses FOR UPDATE SKIP LOCKED to prevent race conditions
    - Returns processed notifications for Edge Function handling

  3. Security
    - Uses SECURITY DEFINER for proper permissions
    - Grants execute to authenticated and service_role users
*/

-- Drop existing function if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS process_notification_queue(integer);

-- Create the function with correct return type
CREATE OR REPLACE FUNCTION process_notification_queue(batch_size integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  notification_type text,
  title text,
  body text,
  data jsonb,
  attempts integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update pending notifications to processing status and return them
  RETURN QUERY
  WITH updated_notifications AS (
    UPDATE notification_queue nq
    SET 
      status = 'processing',
      attempts = nq.attempts + 1,
      processed_at = now()
    WHERE nq.id IN (
      SELECT nq2.id 
      FROM notification_queue nq2
      WHERE nq2.status = 'pending'
        AND nq2.attempts < 3  -- Max 3 retry attempts
      ORDER BY nq2.created_at ASC
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED  -- Prevent concurrent processing
    )
    RETURNING 
      nq.id,
      nq.user_id,
      nq.notification_type,
      nq.title,
      nq.body,
      nq.data,
      nq.attempts
  )
  SELECT 
    un.id,
    un.user_id,
    un.notification_type,
    un.title,
    un.body,
    un.data,
    un.attempts
  FROM updated_notifications un;
END;
$$;

-- Grant execute permission to authenticated and service_role
GRANT EXECUTE ON FUNCTION process_notification_queue(integer) TO authenticated, service_role;