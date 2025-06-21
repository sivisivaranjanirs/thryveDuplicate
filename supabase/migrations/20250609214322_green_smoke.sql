/*
  # Fix Friend Request User Lookup

  1. New Function
    - `get_user_id_by_email` - Secure function to find users by email
    - Uses SECURITY DEFINER to bypass RLS policies
    - Returns user ID and email if found, null if not found

  2. Security
    - Function runs with elevated privileges to search user_profiles
    - Only returns minimal necessary information (id, email)
    - Maintains data privacy while enabling friend requests

  3. Usage
    - Called via Supabase RPC from frontend
    - Replaces direct user_profiles queries in friend request flow
*/

-- Create function to get user ID by email (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_id_by_email(search_email text)
RETURNS TABLE(user_id uuid, user_email text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id as user_id,
    up.email as user_email
  FROM user_profiles up
  WHERE LOWER(up.email) = LOWER(search_email)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_id_by_email(text) TO authenticated;