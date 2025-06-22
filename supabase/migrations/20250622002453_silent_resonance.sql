/*
  # Add Push Notifications Support

  1. New Tables
    - `push_subscriptions` - Store web push notification subscriptions

  2. Security
    - Enable RLS on push_subscriptions table
    - Add policy for users to manage their own subscriptions

  3. Features
    - Support for web push notifications
    - User-specific subscription management
    - Automatic cleanup on user deletion
*/

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'push_subscriptions_user_id_endpoint_key'
    AND table_name = 'push_subscriptions'
  ) THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE(user_id, endpoint);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create new one
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(user_id, is_active);

-- Create unique index for the constraint (if not already created by UNIQUE constraint)
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_id_endpoint_key 
  ON push_subscriptions(user_id, endpoint);

-- Create updated_at trigger if the function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    -- Drop trigger if it exists first
    DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
    
    -- Create the trigger
    CREATE TRIGGER update_push_subscriptions_updated_at
      BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;