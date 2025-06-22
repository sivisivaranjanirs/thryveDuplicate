import React, { useState } from 'react';
import { Bell, BellOff, Check, AlertCircle, Loader2, Send } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { motion, AnimatePresence } from 'framer-motion';

export default function PushNotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    sendTestNotification,
    requestPermission
  } = usePushNotifications();

  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleSubscription = async () => {
    try {
      setMessage(null);
      
      if (isSubscribed) {
        await unsubscribe();
        setMessage({ type: 'success', text: 'Push notifications disabled successfully' });
      } else {
        await subscribe();
        setMessage({ type: 'success', text: 'Push notifications enabled successfully' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update notification settings' 
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      setTestLoading(true);
      setMessage(null);
      
      await sendTestNotification();
      setMessage({ type: 'success', text: 'Test notification sent! Check your notifications.' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to send test notification' 
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setMessage(null);
      const granted = await requestPermission();
      
      if (granted) {
        setMessage({ type: 'success', text: 'Notification permission granted!' });
      } else {
        setMessage({ type: 'error', text: 'Notification permission denied' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to request permission' 
      });
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900 mb-2">Push Notifications Not Supported</h3>
            <p className="text-yellow-700 text-sm">
              Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari to enable this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Bell className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Push Notifications</h2>
          <p className="text-gray-600">Get notified about health updates and activities</p>
        </div>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <Check className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-gray-900">Notification Permission</h3>
            <p className="text-sm text-gray-600">Allow Thryve to send you push notifications</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            permission === 'granted' 
              ? 'bg-green-100 text-green-800'
              : permission === 'denied'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Denied' : 'Not Set'}
          </div>
        </div>

        {permission === 'default' && (
          <button
            onClick={handleRequestPermission}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Request Permission
          </button>
        )}

        {permission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <p className="text-red-700 text-sm">
              Notifications are blocked. Please enable them in your browser settings to receive push notifications.
            </p>
          </div>
        )}
      </div>

      {/* Subscription Settings */}
      {permission === 'granted' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
                {isSubscribed ? (
                  <Bell className="h-5 w-5 text-green-600" />
                ) : (
                  <BellOff className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-600">
                  {isSubscribed 
                    ? 'You will receive push notifications for health updates'
                    : 'Enable push notifications to stay updated'
                  }
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleSubscription}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isSubscribed ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSubscribed ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 animate-spin text-gray-600" />
                </div>
              )}
            </button>
          </div>

          {/* Test Notification */}
          {isSubscribed && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={handleTestNotification}
                disabled={testLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {testLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Send Test Notification</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notification Types */}
      {isSubscribed && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <h3 className="font-medium text-gray-900 mb-4">Notification Types</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Health Updates</p>
                <p className="text-sm text-gray-600">When friends add new health readings</p>
              </div>
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Access Requests</p>
                <p className="text-sm text-gray-600">When someone requests to view your health data</p>
              </div>
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Request Approvals</p>
                <p className="text-sm text-gray-600">When your access requests are approved</p>
              </div>
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}