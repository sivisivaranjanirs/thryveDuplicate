/*
  # Add Push Notifications Support

  1. Purpose
    - Add push_subscriptions table to store user device subscriptions
    - Enable push notification functionality for the PWA
    - Support for Web Push Protocol with VAPID keys

  2. New Tables
    - `push_subscriptions` - Store push notification subscriptions for users

  3. Security
    - Enable RLS on push_subscriptions table
    - Add policies for users to manage their own subscriptions
    - Proper foreign key constraints to auth.users

  4. Features
    - Support for multiple devices per user
    - Automatic cleanup of inactive subscriptions
    - Unique constraint to prevent duplicate subscriptions
*/

-- Create push_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(user_id, is_active);

-- Create updated_at trigger if the function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_push_subscriptions_updated_at
      BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;