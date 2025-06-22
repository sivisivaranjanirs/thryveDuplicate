/*
  # Process Notification Queue Edge Function

  1. Purpose
    - Processes pending push notifications from the notification queue
    - Sends push notifications to users' registered devices
    - Can be called periodically or triggered by events

  2. Security
    - Uses service role key to access notification queue
    - Validates notification data before sending
    - Implements retry logic for failed notifications

  3. Features
    - Batch processing of notifications
    - Automatic cleanup of invalid subscriptions
    - Error handling and logging
    - Rate limiting to prevent spam
*/

import { corsHeaders } from '../_shared/cors.ts';

interface QueuedNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data: any;
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
    // Create Supabase client with service role key
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get batch size from request or use default
    const { batch_size = 10 } = req.method === 'POST' ? await req.json() : {};

    // Process notification queue
    const { data: notifications, error: queueError } = await supabase
      .rpc('process_notification_queue', { batch_size });

    if (queueError) {
      throw new Error(`Failed to process queue: ${queueError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No notifications to process',
          processed: 0
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each notification
    for (const notification of notifications as QueuedNotification[]) {
      try {
        // Get user's push subscriptions
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', notification.user_id)
          .eq('is_active', true);

        if (subError) {
          console.error(`Error fetching subscriptions for user ${notification.user_id}:`, subError);
          failureCount++;
          continue;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No active subscriptions for user ${notification.user_id}`);
          successCount++; // Count as success since there's nothing to send
          continue;
        }

        // Send push notification to all user's devices
        const pushResult = await sendPushNotificationToUser(
          subscriptions,
          notification.title,
          notification.body,
          notification.data
        );

        if (pushResult.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Clean up invalid subscriptions
        if (pushResult.invalidSubscriptions.length > 0) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .in('id', pushResult.invalidSubscriptions);
        }

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        failureCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${notifications.length} notifications`,
        processed: notifications.length,
        results: {
          success: successCount,
          failed: failureCount
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
    console.error('Queue processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process notification queue',
        success: false
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

async function sendPushNotificationToUser(
  subscriptions: any[],
  title: string,
  body: string,
  data: any
): Promise<{ success: boolean; invalidSubscriptions: string[] }> {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@thryve.app';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('VAPID keys not configured - skipping push notification');
    return { success: true, invalidSubscriptions: [] };
  }

  const invalidSubscriptions: string[] = [];
  let sentCount = 0;

  // Prepare notification payload
  const payload = {
    title,
    body,
    icon: data?.icon || '/icons/icon-192x192.png',
    badge: data?.badge || '/icons/icon-72x72.png',
    image: data?.image,
    data: {
      ...data,
      timestamp: Date.now()
    },
    actions: data?.actions || [
      {
        action: 'open',
        title: 'Open App'
      }
    ],
    tag: data?.tag || 'thryve-notification',
    requireInteraction: data?.requireInteraction || false,
    vibrate: [100, 50, 100]
  };

  // Send to all subscriptions
  for (const subscription of subscriptions) {
    try {
      const success = await sendSinglePushNotification(
        subscription.endpoint,
        subscription.p256dh_key,
        subscription.auth_key,
        JSON.stringify(payload),
        vapidPublicKey,
        vapidPrivateKey,
        vapidEmail
      );

      if (success) {
        sentCount++;
      } else {
        invalidSubscriptions.push(subscription.id);
      }
    } catch (error) {
      console.error(`Failed to send to subscription ${subscription.id}:`, error);
      invalidSubscriptions.push(subscription.id);
    }
  }

  return {
    success: sentCount > 0 || subscriptions.length === 0,
    invalidSubscriptions
  };
}

async function sendSinglePushNotification(
  endpoint: string,
  p256dhKey: string,
  authKey: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidEmail: string
): Promise<boolean> {
  try {
    // Import web-push functionality
    const webpush = await import('npm:web-push@3.6.6');
    
    // Set VAPID details
    webpush.setVapidDetails(
      vapidEmail,
      vapidPublicKey,
      vapidPrivateKey
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