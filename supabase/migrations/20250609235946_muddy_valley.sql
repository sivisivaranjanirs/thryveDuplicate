/*
  # Migrate from Friends to Reading Permissions System

  1. New Tables
    - `reading_requests` - Requests to view someone's health readings
    - `reading_permissions` - Active permissions to view readings

  2. Data Migration
    - Convert friend_requests to reading_requests
    - Convert user_friends to reading_permissions

  3. Security
    - Enable RLS on new tables
    - Update health metrics policy for one-way access
    - Create proper notification system

  4. Functions
    - Create reading permission when request is accepted
    - Notify viewers when new health metrics are added
*/

-- Step 1: Drop all dependent objects first
DROP TRIGGER IF EXISTS friend_request_accepted_trigger ON friend_requests;
DROP TRIGGER IF EXISTS health_metric_friend_notification_trigger ON health_metrics;
DROP TRIGGER IF EXISTS update_user_friends_updated_at ON user_friends;
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;

DROP FUNCTION IF EXISTS create_mutual_friendship();
DROP FUNCTION IF EXISTS notify_friends_health_metric();
DROP FUNCTION IF EXISTS debug_friend_access(uuid);
DROP FUNCTION IF EXISTS get_friend_metrics_count(uuid);

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own friendships" ON user_friends;
DROP POLICY IF EXISTS "Users can create mutual friendships" ON user_friends;
DROP POLICY IF EXISTS "Users can update their own friendships" ON user_friends;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON user_friends;

DROP POLICY IF EXISTS "Users can view requests they sent or received" ON friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update requests they received" ON friend_requests;

DROP POLICY IF EXISTS "Health metrics access policy" ON health_metrics;

-- Step 3: Create new tables with correct structure
CREATE TABLE IF NOT EXISTS reading_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, owner_id),
  CHECK (requester_id != owner_id)
);

CREATE TABLE IF NOT EXISTS reading_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(viewer_id, owner_id),
  CHECK (viewer_id != owner_id)
);

-- Step 4: Migrate data from old tables to new tables
INSERT INTO reading_requests (id, requester_id, owner_id, status, message, created_at, updated_at)
SELECT id, sender_id, receiver_id, status, message, created_at, updated_at
FROM friend_requests
ON CONFLICT (requester_id, owner_id) DO NOTHING;

-- For user_friends, we need to create one-way permissions
-- Convert mutual friendships to one-way permissions (keep existing relationships)
INSERT INTO reading_permissions (id, viewer_id, owner_id, status, created_at, updated_at)
SELECT id, user_id, friend_id, status, created_at, updated_at
FROM user_friends
ON CONFLICT (viewer_id, owner_id) DO NOTHING;

-- Step 5: Add foreign key constraints to user_profiles
ALTER TABLE reading_requests 
ADD CONSTRAINT reading_requests_requester_id_profile_fkey 
FOREIGN KEY (requester_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE reading_requests 
ADD CONSTRAINT reading_requests_owner_id_profile_fkey 
FOREIGN KEY (owner_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE reading_permissions 
ADD CONSTRAINT reading_permissions_viewer_id_profile_fkey 
FOREIGN KEY (viewer_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE reading_permissions 
ADD CONSTRAINT reading_permissions_owner_id_profile_fkey 
FOREIGN KEY (owner_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Step 6: Enable RLS on new tables
ALTER TABLE reading_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_permissions ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for new tables
CREATE POLICY "Users can view reading requests they sent or received"
  ON reading_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = owner_id);

CREATE POLICY "Users can send reading requests"
  ON reading_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Owners can update reading requests they received"
  ON reading_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view reading permissions they have or granted"
  ON reading_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = viewer_id OR auth.uid() = owner_id);

CREATE POLICY "System can grant reading permissions"
  ON reading_permissions
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Owners can revoke reading permissions"
  ON reading_permissions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update reading permissions"
  ON reading_permissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Step 8: Update health metrics policy for one-way access
CREATE POLICY "Health metrics access policy"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own metrics
    user_id = auth.uid()
    OR
    -- Users can view metrics of owners who granted them permission
    user_id IN (
      SELECT rp.owner_id 
      FROM reading_permissions rp 
      WHERE rp.viewer_id = auth.uid() 
        AND rp.status = 'active'
    )
  );

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_requests_requester ON reading_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_reading_requests_owner ON reading_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_reading_requests_status ON reading_requests(status);

CREATE INDEX IF NOT EXISTS idx_reading_permissions_viewer_id ON reading_permissions(viewer_id);
CREATE INDEX IF NOT EXISTS idx_reading_permissions_owner_id ON reading_permissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_reading_permissions_active_lookup 
  ON reading_permissions(viewer_id, owner_id) 
  WHERE status = 'active';

-- Step 10: Create new functions for one-way access
CREATE OR REPLACE FUNCTION create_reading_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if request was accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create one-way permission: requester can view owner's readings
    INSERT INTO reading_permissions (viewer_id, owner_id)
    VALUES (NEW.requester_id, NEW.owner_id)
    ON CONFLICT (viewer_id, owner_id) DO NOTHING;
    
    -- Create notification for requester
    INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message)
    VALUES (
      NEW.requester_id,
      NEW.owner_id,
      'reading_accepted',
      'Reading Request Accepted',
      'Your request to view health readings has been accepted!'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_reading_viewers_health_metric()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for users who have permission to view this user's readings
  INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message, data)
  SELECT 
    rp.viewer_id as user_id,
    NEW.user_id as friend_id,
    'health_metric' as notification_type,
    'Health Update Available' as title,
    format('New %s reading available: %s %s', 
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
  FROM reading_permissions rp
  WHERE rp.owner_id = NEW.user_id 
    AND rp.status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create triggers
CREATE TRIGGER reading_request_accepted_trigger
  AFTER UPDATE ON reading_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_reading_permission();

CREATE TRIGGER health_metric_viewer_notification_trigger
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION notify_reading_viewers_health_metric();

-- Step 12: Create updated_at triggers if function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_reading_permissions_updated_at
      BEFORE UPDATE ON reading_permissions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_reading_requests_updated_at
      BEFORE UPDATE ON reading_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Step 13: Update notification types (only update existing ones, don't fail on constraint)
DO $$
BEGIN
  -- Update existing notifications
  UPDATE friend_notifications 
  SET notification_type = 'reading_request' 
  WHERE notification_type = 'friend_request';

  UPDATE friend_notifications 
  SET notification_type = 'reading_accepted' 
  WHERE notification_type = 'friend_accepted';

  -- Drop and recreate constraint
  ALTER TABLE friend_notifications DROP CONSTRAINT IF EXISTS friend_notifications_notification_type_check;
  ALTER TABLE friend_notifications ADD CONSTRAINT friend_notifications_notification_type_check 
  CHECK (notification_type IN ('health_metric', 'reading_request', 'reading_accepted'));
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint update fails, just continue
    NULL;
END $$;

-- Step 14: Create debug functions
CREATE OR REPLACE FUNCTION debug_reading_access(owner_user_id uuid)
RETURNS TABLE(
  current_user_id uuid,
  target_owner_id uuid,
  permission_exists boolean,
  permission_status text,
  can_access_metrics boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    owner_user_id as target_owner_id,
    EXISTS(
      SELECT 1 FROM reading_permissions rp 
      WHERE rp.viewer_id = auth.uid() 
        AND rp.owner_id = owner_user_id
    ) as permission_exists,
    COALESCE(
      (SELECT rp.status FROM reading_permissions rp 
       WHERE rp.viewer_id = auth.uid() 
         AND rp.owner_id = owner_user_id 
       LIMIT 1), 
      'none'
    ) as permission_status,
    EXISTS(
      SELECT 1 FROM reading_permissions rp 
      WHERE rp.viewer_id = auth.uid() 
        AND rp.owner_id = owner_user_id 
        AND rp.status = 'active'
    ) as can_access_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_reading_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION get_owner_metrics_count(owner_user_id uuid)
RETURNS integer AS $$
DECLARE
  metric_count integer;
BEGIN
  -- Check if permission exists and is active
  IF NOT EXISTS(
    SELECT 1 FROM reading_permissions 
    WHERE viewer_id = auth.uid() 
      AND owner_id = owner_user_id 
      AND status = 'active'
  ) THEN
    RETURN -1; -- Indicates no permission
  END IF;
  
  -- Count metrics
  SELECT COUNT(*) INTO metric_count
  FROM health_metrics 
  WHERE user_id = owner_user_id;
  
  RETURN metric_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_owner_metrics_count(uuid) TO authenticated;

-- Step 15: Drop old tables (after data migration)
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS user_friends CASCADE;