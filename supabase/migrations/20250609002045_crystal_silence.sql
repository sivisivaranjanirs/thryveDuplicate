/*
  # WhatsApp Notifications System

  1. New Tables
    - `whatsapp_contacts` - Store WhatsApp contact information for notifications
    - `notification_settings` - User preferences for WhatsApp notifications  
    - `notification_logs` - Track sent notifications and delivery status

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to manage their own data
    - Proper foreign key constraints to auth.users

  3. Features
    - Automatic notification triggers when health metrics are added
    - Support for multiple notification types (daily summary, instant alerts)
    - Contact management with phone numbers and preferences
    - Delivery tracking and error logging
*/

-- WhatsApp Contacts Table
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone_number text NOT NULL,
  is_active boolean DEFAULT true,
  notification_types text[] DEFAULT ARRAY['daily_summary', 'metric_update'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own WhatsApp contacts"
  ON whatsapp_contacts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_enabled boolean DEFAULT false,
  daily_summary_enabled boolean DEFAULT true,
  daily_summary_time time DEFAULT '09:00:00',
  instant_alerts_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification settings"
  ON notification_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES whatsapp_contacts(id) ON DELETE SET NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('daily_summary', 'critical_alert', 'metric_update')),
  message_content text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON notification_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_user_id ON whatsapp_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_active ON whatsapp_contacts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- Update triggers (only create if the function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_whatsapp_contacts_updated_at
      BEFORE UPDATE ON whatsapp_contacts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_notification_settings_updated_at
      BEFORE UPDATE ON notification_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to trigger WhatsApp notifications when health metrics are added
CREATE OR REPLACE FUNCTION trigger_whatsapp_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a notification job for processing
  INSERT INTO notification_logs (user_id, notification_type, message_content)
  VALUES (
    NEW.user_id,
    'metric_update',
    format('New %s reading: %s %s recorded at %s', 
           NEW.metric_type, 
           NEW.value, 
           NEW.unit, 
           NEW.recorded_at::text
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to send notifications when health metrics are added
DROP TRIGGER IF EXISTS health_metric_notification_trigger ON health_metrics;
CREATE TRIGGER health_metric_notification_trigger
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_whatsapp_notification();