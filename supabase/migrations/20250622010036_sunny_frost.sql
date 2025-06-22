/*
  # Create process_notification_queue function

  1. Purpose
    - Creates the missing database function that the process-notification-queue Edge Function calls
    - Processes pending notifications from the notification_queue table
    - Updates notification status and tracks processing attempts

  2. Function Details
    - Takes batch_size parameter to limit number of notifications processed
    - Returns processed notifications for the Edge Function to handle
    - Updates notification status to 'processing' to prevent duplicate processing
    - Handles retry logic by incrementing attempts counter

  3. Security
    - Uses SECURITY DEFINER to allow service role access
    - Only processes pending notifications
    - Atomic operations to prevent race conditions
*/

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