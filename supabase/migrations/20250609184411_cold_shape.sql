/*
  # Add foreign key relationships for friends functionality

  1. Foreign Key Constraints
    - Add foreign key from `user_friends.friend_id` to `user_profiles.id`
    - Add foreign key from `friend_requests.sender_id` to `user_profiles.id`
    - Add foreign key from `friend_requests.receiver_id` to `user_profiles.id`
    - Add foreign key from `friend_notifications.friend_id` to `user_profiles.id`

  2. Notes
    - These constraints will allow Supabase PostgREST to resolve the joins in the friends queries
    - All constraints use CASCADE delete to maintain referential integrity
*/

-- Add foreign key constraint for user_friends.friend_id -> user_profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_friends_friend_id_profile_fkey'
  ) THEN
    ALTER TABLE user_friends 
    ADD CONSTRAINT user_friends_friend_id_profile_fkey 
    FOREIGN KEY (friend_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for friend_requests.sender_id -> user_profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friend_requests_sender_id_profile_fkey'
  ) THEN
    ALTER TABLE friend_requests 
    ADD CONSTRAINT friend_requests_sender_id_profile_fkey 
    FOREIGN KEY (sender_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for friend_requests.receiver_id -> user_profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friend_requests_receiver_id_profile_fkey'
  ) THEN
    ALTER TABLE friend_requests 
    ADD CONSTRAINT friend_requests_receiver_id_profile_fkey 
    FOREIGN KEY (receiver_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for friend_notifications.friend_id -> user_profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'friend_notifications_friend_id_profile_fkey'
  ) THEN
    ALTER TABLE friend_notifications 
    ADD CONSTRAINT friend_notifications_friend_id_profile_fkey 
    FOREIGN KEY (friend_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;