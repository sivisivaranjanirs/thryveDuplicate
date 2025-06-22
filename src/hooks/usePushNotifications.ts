import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface PushSubscriptionData {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { user } = useAuth();

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user || !isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      if (subscription) {
        // Verify subscription exists in database
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .eq('is_active', true)
          .single();

        if (!data) {
          // Subscription exists in browser but not in database, re-save it
          await saveSubscriptionToDatabase(subscription);
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const subscribe = async (): Promise<boolean> => {
    if (!user || !isSupported) {
      throw new Error('Cannot subscribe: user not authenticated or push not supported');
    }

    setLoading(true);

    try {
      // Request permission if not already granted
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Push notification permission denied');
        }
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Generate VAPID key (you'll need to set this in your environment)
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      await saveSubscriptionToDatabase(subscription);
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!user || !isSupported) return false;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveSubscriptionToDatabase = async (subscription: PushSubscription) => {
    if (!user) return;

    const subscriptionData = subscription.toJSON();
    const keys = subscriptionData.keys;

    if (!keys || !subscriptionData.endpoint) {
      throw new Error('Invalid subscription data');
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscriptionData.endpoint,
        p256dh_key: keys.p256dh || '',
        auth_key: keys.auth || '',
        is_active: true
      }, {
        onConflict: 'user_id,endpoint'
      });

    if (error) {
      throw new Error(`Failed to save subscription: ${error.message}`);
    }
  };

  const sendTestNotification = async () => {
    if (!user || !isSubscribed) return;

    try {
      // Call edge function to send test notification
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          title: 'Test Notification',
          body: 'This is a test push notification from Thryve!',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          data: {
            type: 'test',
            timestamp: Date.now()
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    sendTestNotification,
    requestPermission
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}