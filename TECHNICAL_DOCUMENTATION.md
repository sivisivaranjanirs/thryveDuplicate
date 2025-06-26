# Thryve - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Security](#authentication--security)
5. [Frontend Implementation](#frontend-implementation)
6. [Backend Services](#backend-services)
7. [Real-time Features](#real-time-features)
8. [API Integration](#api-integration)
9. [Deployment](#deployment)
10. [Development Setup](#development-setup)

## Project Overview

Thryve is a modern health tracking application built with React, TypeScript, and Supabase. It enables users to track health metrics, communicate with an AI health assistant, and share health data with trusted contacts through a permission-based system.

### Key Features
- **Health Metrics Tracking**: Blood pressure, heart rate, temperature, weight, sleep
- **AI Health Assistant**: Conversational AI powered by Hugging Face models
- **Reading Access System**: Permission-based health data sharing
- **Real-time Notifications**: Live updates for health activities
- **Profile Management**: Comprehensive user profile system

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- **AI Integration**: Hugging Face Inference API (Mistral-7B-Instruct)
- **Deployment**: Netlify
- **Icons**: Lucide React

## Architecture

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │    Supabase      │    │  Hugging Face   │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │ Components  │ │◄──►│ │ PostgreSQL   │ │    │ │ Mistral-7B  │ │
│ │ Hooks       │ │    │ │ Auth         │ │    │ │ Instruct    │ │
│ │ Services    │ │    │ │ Real-time    │ │◄──►│ │ Model       │ │
│ └─────────────┘ │    │ │ Edge Funcs   │ │    │ └─────────────┘ │
└─────────────────┘    │ └──────────────┘ │    └─────────────────┘
                       └──────────────────┘
```

### Component Architecture
```
App.tsx
├── Header.tsx (Navigation, Notifications, Profile)
├── Sidebar.tsx (Navigation Menu)
├── Dashboard.tsx (Health Overview)
├── HealthTracking.tsx (Metric Recording)
├── VoiceChat.tsx (AI Assistant)
├── ChatHistory.tsx (Conversation Management)
├── FriendsManagement.tsx (Access Control)
├── ProfileSettings.tsx (User Profile)
└── FriendHealthReport.tsx (Shared Health Data)
```

## Database Schema

### Core Tables

#### `user_profiles`
Stores user profile information and personal details.
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `health_metrics`
Central table for all health data tracking.
```sql
CREATE TABLE health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('blood_pressure', 'heart_rate', 'temperature', 'weight', 'sleep')),
  value text NOT NULL,
  unit text NOT NULL,
  notes text,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

#### `reading_permissions`
Manages one-way access permissions for health data sharing.
```sql
CREATE TABLE reading_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(viewer_id, owner_id),
  CHECK (viewer_id != owner_id)
);
```

#### `reading_requests`
Handles requests for health data access.
```sql
CREATE TABLE reading_requests (
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
```

#### `chat_conversations` & `chat_messages`
Manages AI assistant conversations.
```sql
CREATE TABLE chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content text NOT NULL,
  is_voice boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

#### `friend_notifications`
Real-time notification system for health activities.
```sql
CREATE TABLE friend_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('health_metric', 'reading_request', 'reading_accepted')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### Database Triggers & Functions

#### Health Metric Notifications
Automatically notifies users with reading permissions when new health data is added:
```sql
CREATE OR REPLACE FUNCTION notify_reading_viewers_health_metric()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_email text;
  display_name text;
BEGIN
  -- Get user's display name
  SELECT up.full_name, up.email 
  INTO user_name, user_email
  FROM user_profiles up 
  WHERE up.id = NEW.user_id;
  
  -- Determine display name
  IF user_name IS NOT NULL AND user_name != '' THEN
    display_name := user_name;
  ELSIF user_email IS NOT NULL THEN
    display_name := split_part(user_email, '@', 1);
  ELSE
    display_name := 'Someone';
  END IF;
  
  -- Create notifications for viewers
  INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message, data)
  SELECT 
    rp.viewer_id as user_id,
    NEW.user_id as friend_id,
    'health_metric' as notification_type,
    'Health Update Available' as title,
    format('%s added a new %s reading: %s %s', 
           display_name,
           replace(NEW.metric_type, '_', ' '),
           NEW.value, 
           NEW.unit
    ) as message,
    jsonb_build_object(
      'metric_type', NEW.metric_type,
      'value', NEW.value,
      'unit', NEW.unit,
      'recorded_at', NEW.recorded_at,
      'user_name', display_name
    ) as data
  FROM reading_permissions rp
  WHERE rp.owner_id = NEW.user_id 
    AND rp.status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Permission Creation
Automatically creates reading permissions when requests are accepted:
```sql
CREATE OR REPLACE FUNCTION create_reading_permission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create one-way permission
    INSERT INTO reading_permissions (viewer_id, owner_id)
    VALUES (NEW.requester_id, NEW.owner_id)
    ON CONFLICT (viewer_id, owner_id) DO NOTHING;
    
    -- Create notification
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Authentication & Security

### Row Level Security (RLS)
All tables implement comprehensive RLS policies:

#### Health Metrics Access
```sql
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
```

#### Profile Access Control
```sql
CREATE POLICY "Users can read profiles with reading access"
  ON user_profiles
  FOR SELECT
  TO authenticated, service_role
  USING (
    current_setting('role') = 'service_role'
    OR auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM reading_permissions rp
      WHERE rp.viewer_id = auth.uid()
        AND rp.owner_id = user_profiles.id
        AND rp.status = 'active'
    )
    -- Additional conditions for requests and reverse permissions
  );
```

### Authentication Flow
1. **Sign Up/Sign In**: Supabase Auth handles email/password authentication
2. **Profile Creation**: Automatic profile creation via database trigger
3. **Session Management**: JWT tokens with automatic refresh
4. **Permission Checks**: RLS policies enforce data access rules

## Frontend Implementation

### State Management
The application uses React hooks for state management:

#### Custom Hooks
- **`useAuth`**: Authentication state and user profile management
- **`useHealthMetrics`**: Health data CRUD operations
- **`useChat`**: AI conversation management
- **`useFriends`**: Reading permissions and notifications
- **`useFriendHealthMetrics`**: Access to shared health data

#### Example Hook Implementation
```typescript
export function useHealthMetrics(metricType?: string) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMetrics = async () => {
    if (!user) return;
    
    let query = supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false });

    if (metricType) {
      query = query.eq('metric_type', metricType);
    }

    const { data, error } = await query;
    if (error) throw error;
    setMetrics(data || []);
  };

  const addMetric = async (metric: Omit<HealthMetric, 'id' | 'user_id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('health_metrics')
      .insert([{ ...metric, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    setMetrics(prev => [data, ...prev]);
    return { data, error: null };
  };

  useEffect(() => {
    fetchMetrics();
  }, [user, metricType]);

  return { metrics, loading, addMetric, /* other methods */ };
}
```

### Component Design Patterns

#### Compound Components
Complex components like `FriendsManagement` use compound patterns:
```typescript
// Main component with tab state
const FriendsManagement = () => {
  const [activeTab, setActiveTab] = useState<'friends' | 'my-access' | 'requests'>('friends');
  
  return (
    <div>
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <TabContent activeTab={activeTab} />
    </div>
  );
};
```

#### Error Boundaries
Critical components are wrapped in error boundaries:
```typescript
<ErrorBoundary>
  <FriendsManagement />
</ErrorBoundary>
```

### Real-time Updates
Components subscribe to real-time changes using Supabase channels:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`notifications_${user.id}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'friend_notifications',
        filter: `user_id=eq.${user.id}`
      }, 
      (payload) => {
        fetchNotifications();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

## Backend Services

### Edge Functions
Supabase Edge Functions handle external API integrations and complex operations.

#### LLM Chat Function
Integrates with Hugging Face for AI conversations:
```typescript
// supabase/functions/llm-chat/index.ts
Deno.serve(async (req: Request) => {
  const { message, conversationHistory } = await req.json();
  
  // Build conversation context
  let conversationText = systemPrompt + '\n\n';
  conversationHistory.forEach(msg => {
    conversationText += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
  });
  conversationText += `Human: ${message}\nAssistant:`;

  // Call Hugging Face API
  const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: conversationText,
      parameters: {
        max_new_tokens: 300,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false,
      }
    }),
  });

  const data = await response.json();
  const aiResponse = data[0].generated_text.trim();
  
  return new Response(JSON.stringify({ 
    response: aiResponse,
    success: true 
  }));
});
```

#### Notification Function
Handles system notifications with service role permissions:
```typescript
// supabase/functions/send-friend-notification/index.ts
Deno.serve(async (req: Request) => {
  const notificationData = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Bypasses RLS
  );

  const { data, error } = await supabase
    .from('friend_notifications')
    .insert([{
      user_id: notificationData.user_id,
      friend_id: notificationData.friend_id,
      notification_type: notificationData.notification_type,
      title: notificationData.title,
      message: notificationData.message,
      is_read: false
    }]);

  return new Response(JSON.stringify({ success: true, data }));
});
```

### Database Functions
Custom PostgreSQL functions for complex queries:

#### User Lookup by Email
```sql
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
```

#### Debug Functions
For troubleshooting access issues:
```sql
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
```

## Real-time Features

### Notification System
The application implements a comprehensive real-time notification system:

#### Notification Types
- **Health Metric Updates**: When users add new health readings
- **Reading Requests**: When someone requests access to health data
- **Reading Accepted**: When access requests are approved

#### Real-time Subscriptions
```typescript
const {
  notifications,
  unreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = useFriends();

// Auto-mark notifications as read when dropdown opens
const toggleNotifications = async () => {
  const wasOpen = showNotifications;
  setShowNotifications(!showNotifications);
  
  if (!wasOpen && unreadNotificationsCount > 0) {
    await markAllNotificationsAsRead();
  }
};
```

### Live Data Updates
Components automatically update when underlying data changes:
- Health metrics list updates when new readings are added
- Friend lists update when permissions are granted/revoked
- Chat conversations update with new messages

## API Integration

### Hugging Face Integration
The application integrates with Hugging Face's Inference API for AI conversations and Eleven Labs for voice capabilities:

#### Model Configuration
- **Model**: `mistralai/Mistral-7B-Instruct-v0.3`
- **Parameters**: 
  - `max_new_tokens`: 300
  - `temperature`: 0.7
  - `top_p`: 0.9
  - `do_sample`: true

#### System Prompt
```typescript
const systemPrompt = `You are a warm, empathetic, and conversational health companion. Your purpose is to support users in discussing and reflecting on their physical, mental, and emotional health.

You speak like a thoughtful, understanding friend — not a doctor, not a bot. Ask gentle, open-ended questions to encourage self-reflection. Respond naturally, acknowledge feelings, and offer helpful, evidence-based suggestions when appropriate.

💡 You can talk about:
• Sleep, energy, stress, and emotions
• Physical health: diet, fitness, hydration, pain, symptoms
• Mental well-being, moods, routines, burnout, motivation
• Mindfulness, self-care, and healthy habits

🚫 Avoid or decline:
• Conversations not related to health or well-being`;

### Eleven Labs Integration
The application integrates with Eleven Labs for voice capabilities:

#### Text-to-Speech (TTS)
- **Voice ID**: `EXAVITQu4vr4xnSDxMaL` (Rachel voice)
- **Model**: `eleven_monolingual_v1`
- **Voice Settings**:
  - `stability`: 0.5
  - `similarity_boost`: 0.75

#### Speech-to-Text (STT)
- **Model**: `whisper-1`
- **Language**: English (default)

#### Integration Flow
1. User voice input is captured and sent to Eleven Labs STT
2. Transcribed text is sent to Hugging Face LLM
3. LLM response is sent to Eleven Labs TTS
• Conversations not related to health or well-being
• Diagnosing medical conditions or providing medical treatment
• Sensitive topics that require professional help`;
```

### Supabase API Usage
The application extensively uses Supabase's auto-generated APIs:

#### Type-safe Database Operations
```typescript
// Generated types from database schema
export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'sleep';
  value: string;
  unit: string;
  notes?: string;
  recorded_at: string;
  created_at: string;
}

// Type-safe queries
const { data, error } = await supabase
  .from('health_metrics')
  .select('*')
  .eq('user_id', user.id)
  .order('recorded_at', { ascending: false });
```

## Deployment

### Build Configuration
The application is built using Vite with optimized settings:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  }
});
```

### Environment Variables
Required environment variables for deployment:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
ELEVEN_LABS_API_KEY=your_eleven_labs_api_key

# Hugging Face API (for Edge Functions)
HF_API_KEY=your_hugging_face_api_key

# Email Notifications (optional)
RESEND_API_KEY=your_resend_api_key
```

### Netlify Deployment
The application is deployed on Netlify with the following configuration:
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18.x
- **Environment Variables**: Set in Netlify dashboard

### Performance Optimizations
- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: External images from Pexels
- **Bundle Analysis**: Optimized chunk sizes
- **Caching**: Aggressive caching for static assets

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Hugging Face account (for AI features)

### Local Development
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd thryve
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Fill in your Supabase credentials
   ```

4. **Database Setup**
   ```bash
   # Run migrations in Supabase dashboard
   # Or use Supabase CLI if available
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Database Migrations
The application includes comprehensive database migrations:
- **Schema Creation**: Tables, indexes, constraints
- **Security Setup**: RLS policies, triggers
- **Function Creation**: Custom PostgreSQL functions
- **Data Seeding**: Sample data for development

### Testing Strategy
- **Component Testing**: React Testing Library
- **Integration Testing**: Supabase client testing
- **E2E Testing**: Playwright (recommended)
- **Type Safety**: TypeScript strict mode

### Code Quality
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **TypeScript**: Strict type checking

## Security Considerations

### Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **RLS Policies**: Comprehensive row-level security
- **Input Validation**: Client and server-side validation
- **SQL Injection**: Prevented by Supabase's query builder

### Privacy Features
- **One-way Permissions**: Users control who sees their data
- **Granular Access**: Permission-based data sharing
- **Data Deletion**: Cascade deletes for user privacy
- **Audit Trail**: Comprehensive logging of access

### Authentication Security
- **JWT Tokens**: Secure session management
- **Password Requirements**: Minimum 6 characters
- **Session Timeout**: Automatic token refresh
- **CORS Configuration**: Restricted origins

This documentation provides a comprehensive overview of the Thryve application's technical implementation, covering all major aspects from database design to deployment strategies.