/*
  # Create process_notification_queue function

  1. New Functions
    - `process_notification_queue(batch_size integer)` - Processes pending notifications from the queue
      - Returns a batch of pending notifications
      - Marks them as being processed
      - Uses SECURITY DEFINER to bypass RLS policies

  2. Security
    - Function runs with elevated privileges to access notification_queue table
    - Only processes notifications in 'pending' status
    - Limits batch size to prevent overwhelming the system
*/

CREATE OR REPLACE FUNCTION public.process_notification_queue(batch_size integer DEFAULT 10)
RETURNS TABLE (
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
DECLARE
  notification_ids uuid[];
BEGIN
  -- Get a batch of pending notifications
  SELECT array_agg(nq.id)
  INTO notification_ids
  FROM notification_queue nq
  WHERE nq.status = 'pending'
    AND nq.attempts < 3
  ORDER BY nq.created_at ASC
  LIMIT batch_size;

  -- If no notifications found, return empty result
  IF notification_ids IS NULL OR array_length(notification_ids, 1) = 0 THEN
    RETURN;
  END IF;

  -- Mark notifications as being processed and increment attempts
  UPDATE notification_queue
  SET 
    status = 'sent',
    attempts = attempts + 1,
    processed_at = now()
  WHERE notification_queue.id = ANY(notification_ids);

  -- Return the notification data
  RETURN QUERY
  SELECT 
    nq.id,
    nq.user_id,
    nq.notification_type,
    nq.title,
    nq.body,
    nq.data
  FROM notification_queue nq
  WHERE nq.id = ANY(notification_ids);
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.process_notification_queue(integer) TO authenticated, service_role;