import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'health-tracker-app'
    }
  }
});

// Test the connection
supabase.auth.getSession().catch(error => {
  console.error('Supabase connection test failed:', error);
});

// Database types
export interface UserProfile {
  id: string;
  full_name?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'blood_glucose';
  value: string;
  unit: string;
  notes?: string;
  recorded_at: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  is_voice: boolean;
  created_at: string;
}

interface UserFeedback {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  type: 'suggestion' | 'bug' | 'praise' | 'other';
  title: string;
  description: string;
  rating?: number;
  status: 'pending' | 'reviewed' | 'implemented' | 'declined';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

interface WhatsAppContact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
  notification_types: string[];
  created_at: string;
  updated_at: string;
}

interface NotificationSettings {
  id: string;
  user_id: string;
  whatsapp_enabled: boolean;
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  instant_alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface UserFriend {
  id: string;
  viewer_id: string;
  owner_id: string;
  status: 'active' | 'blocked';
  created_at: string;
  updated_at: string;
}

interface ReadingRequest {
  id: string;
  requester_id: string;
  owner_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  updated_at: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FriendNotification {
  id: string;
  user_id: string;
  friend_id: string;
  notification_type: 'health_metric' | 'friend_request' | 'friend_accepted';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}