/*
  # Friend-based Notification System

  1. New Tables
    - `user_friends` - Friend connections between users
    - `friend_requests` - Pending friend requests
    - `push_subscriptions` - Web push notification subscriptions
    - `friend_notifications` - Notifications for friend activities

  2. Changes
    - Remove WhatsApp-related tables and functions
    - Add friend management system
    - Add push notification support
    - Update notification triggers for friend activities

  3. Security
    - Enable RLS on all new tables
    - Add policies for friend management
    - Proper notification privacy controls
*/

-- Drop WhatsApp-related tables
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS whatsapp_contacts CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;

-- Drop WhatsApp notification trigger
DROP TRIGGER IF EXISTS health_metric_notification_trigger ON health_metrics;
DROP FUNCTION IF EXISTS trigger_whatsapp_notification();

-- Create user_friends table for friend connections
CREATE TABLE IF NOT EXISTS user_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create friend_requests table for pending requests
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Create push_subscriptions table for web push notifications
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

-- Create friend_notifications table for activity notifications
CREATE TABLE IF NOT EXISTS friend_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('health_metric', 'friend_request', 'friend_accepted')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for user_friends
CREATE POLICY "Users can view their own friendships"
  ON user_friends
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can manage their own friendships"
  ON user_friends
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for friend_requests
CREATE POLICY "Users can view requests they sent or received"
  ON friend_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they received"
  ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

-- Policies for push_subscriptions
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for friend_notifications
CREATE POLICY "Users can view their own notifications"
  ON friend_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON friend_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON friend_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_friends_user_id ON user_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id ON user_friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_notifications_user_id ON friend_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_notifications_read ON friend_notifications(user_id, is_read);

-- Update triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_user_friends_updated_at
      BEFORE UPDATE ON user_friends
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_friend_requests_updated_at
      BEFORE UPDATE ON friend_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_push_subscriptions_updated_at
      BEFORE UPDATE ON push_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to create mutual friendship when request is accepted
CREATE OR REPLACE FUNCTION create_mutual_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if request was accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create friendship from sender to receiver
    INSERT INTO user_friends (user_id, friend_id)
    VALUES (NEW.sender_id, NEW.receiver_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    -- Create friendship from receiver to sender
    INSERT INTO user_friends (user_id, friend_id)
    VALUES (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    -- Create notification for sender
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message)
    VALUES (
      NEW.sender_id,
      NEW.receiver_id,
      'friend_accepted',
      'Friend Request Accepted',
      'Your friend request has been accepted!'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for creating friendships when requests are accepted
CREATE TRIGGER friend_request_accepted_trigger
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_mutual_friendship();

-- Function to notify friends when health metrics are added
CREATE OR REPLACE FUNCTION notify_friends_health_metric()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for all friends
  INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message, data)
  SELECT 
    uf.friend_id as user_id,
    NEW.user_id as friend_id,
    'health_metric' as notification_type,
    'Friend Health Update' as title,
    format('Your friend recorded a new %s reading: %s %s', 
           NEW.metric_type, 
           NEW.value, 
           NEW.unit
    ) as message,
    jsonb_build_object(
      'metric_type', NEW.metric_type,
      'value', NEW.value,
      'unit', NEW.unit,
      'recorded_at', NEW.recorded_at
    ) as data
  FROM user_friends uf
  WHERE uf.user_id = NEW.user_id 
    AND uf.status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify friends when health metrics are added
CREATE TRIGGER health_metric_friend_notification_trigger
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION notify_friends_health_metric();

-- Add email column to user_profiles for friend search
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email text;
  END IF;
END $$;

-- Function to sync email from auth.users to user_profiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_profiles with email from auth.users
  INSERT INTO user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) 
  DO UPDATE SET email = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync email when user signs up
CREATE OR REPLACE TRIGGER sync_user_email_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();