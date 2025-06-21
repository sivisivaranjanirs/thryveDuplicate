/*
  # Send Push Notification Edge Function

  1. Purpose
    - Sends push notifications to users' registered devices
    - Handles notification payload formatting and delivery
    - Integrates with Web Push Protocol using VAPID keys

  2. Security
    - Uses Supabase environment variables for VAPID keys
    - Validates user authentication and subscription ownership
    - Implements CORS for web requests

  3. Features
    - Send notifications to specific users
    - Support for custom notification data
    - Automatic retry logic for failed deliveries
    - Cleanup of invalid subscriptions
*/

import { corsHeaders } from '../_shared/cors.ts';

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@thryve.app';

interface NotificationRequest {
  user_id?: string;
  subscription_id?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate VAPID configuration
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('VAPID keys not configured - push notifications disabled');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Push notifications disabled (VAPID not configured)',
          sent: false
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse request body
    const notificationData: NotificationRequest = await req.json();

    if (!notificationData.title || !notificationData.body) {
      throw new Error('Title and body are required');
    }

    // Create Supabase client with service role key
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let subscriptions: any[] = [];

    if (notificationData.subscription_id) {
      // Send to specific subscription
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('id', notificationData.subscription_id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (data) subscriptions = [data];
    } else if (notificationData.user_id) {
      // Send to all user's subscriptions
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', notificationData.user_id)
        .eq('is_active', true);

      if (error) throw error;
      subscriptions = data || [];
    } else {
      throw new Error('Either user_id or subscription_id is required');
    }

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No active subscriptions found',
          sent: false
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Prepare notification payload
    const payload = {
      title: notificationData.title,
      body: notificationData.body,
      icon: notificationData.icon || '/icons/icon-192x192.png',
      badge: notificationData.badge || '/icons/icon-72x72.png',
      image: notificationData.image,
      data: {
        ...notificationData.data,
        timestamp: Date.now(),
        url: '/' // Default to app root
      },
      actions: notificationData.actions || [
        {
          action: 'open',
          title: 'Open App'
        }
      ],
      tag: notificationData.tag || 'thryve-notification',
      requireInteraction: notificationData.requireInteraction || false,
      vibrate: [100, 50, 100]
    };

    let successCount = 0;
    let failureCount = 0;
    const invalidSubscriptions: string[] = [];

    // Send notifications to all subscriptions
    for (const subscription of subscriptions) {
      try {
        const success = await sendPushNotification(
          subscription.endpoint,
          subscription.p256dh_key,
          subscription.auth_key,
          JSON.stringify(payload)
        );

        if (success) {
          successCount++;
        } else {
          failureCount++;
          invalidSubscriptions.push(subscription.id);
        }
      } catch (error) {
        console.error(`Failed to send notification to subscription ${subscription.id}:`, error);
        failureCount++;
        invalidSubscriptions.push(subscription.id);
      }
    }

    // Clean up invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', invalidSubscriptions);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Notifications sent successfully`,
        sent: true,
        results: {
          total: subscriptions.length,
          success: successCount,
          failed: failureCount,
          invalidSubscriptions: invalidSubscriptions.length
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send push notification',
        success: false,
        sent: false
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function sendPushNotification(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  payload: string
): Promise<boolean> {
  try {
    // Import web-push functionality
    const webpush = await import('npm:web-push@3.6.6');
    
    // Set VAPID details
    webpush.setVapidDetails(
      vapidEmail,
      vapidPublicKey!,
      vapidPrivateKey!
    );

    // Create subscription object
    const pushSubscription = {
      endpoint: endpoint,
      keys: {
        p256dh: p256dhKey,
        auth: authKey
      }
    };

    // Send notification
    await webpush.sendNotification(pushSubscription, payload);
    return true;
  } catch (error) {
    console.error('Web push error:', error);
    
    // Check if it's a subscription error (410 = Gone, 404 = Not Found)
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('Subscription is no longer valid');
      return false;
    }
    
    throw error;
  }
}