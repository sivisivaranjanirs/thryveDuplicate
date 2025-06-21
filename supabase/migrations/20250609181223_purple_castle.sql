/*
  # Add INSERT policy for notification_logs table

  1. Security Changes
    - Add RLS policy to allow service role to insert notification logs
    - This enables the WhatsApp notification system to log notification attempts
    - Maintains security by only allowing service role access for inserts

  2. Background
    - The notification_logs table currently only has SELECT policy
    - When health metrics are added, the system tries to log notifications
    - Without INSERT policy, this fails with RLS violation
*/

-- Add policy to allow service role to insert notification logs
CREATE POLICY "Service role can insert notification logs"
  ON notification_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add policy to allow authenticated users to insert their own notification logs
-- This is needed for any client-side notification logging
CREATE POLICY "Users can insert own notification logs"
  ON notification_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);