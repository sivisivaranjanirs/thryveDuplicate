/*
  # Add User Feedback System

  1. New Tables
    - `user_feedback` - Store user feedback about the application
    
  2. Security
    - Enable RLS on the new table
    - Add policies for users to manage their own feedback
    - Allow service role to read all feedback

  3. Features
    - Support for different feedback types (suggestions, bugs, praise)
    - Rating system for praise feedback
    - Status tracking for feedback implementation
*/

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text,
  type text NOT NULL CHECK (type IN ('suggestion', 'bug', 'praise', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'implemented', 'declined')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own feedback"
  ON user_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON user_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can view all feedback"
  ON user_feedback
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update feedback"
  ON user_feedback
  FOR UPDATE
  TO service_role
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);

-- Create updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_user_feedback_updated_at
      BEFORE UPDATE ON user_feedback
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;