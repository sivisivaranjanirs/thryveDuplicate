import React, { useState } from 'react';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionModal from './SubscriptionModal';

export default function SubscriptionSettings() {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const {
    isPremium,
    subscriptionStatus,
    currentPlan,
    expirationDate,
    restorePurchases,
    cancelSubscription
  } = useSubscription();

  const handleRestore = async () => {
    setLoading(true);
    const result = await restorePurchases();
    
    if (result.success) {
      alert('Purchases restored successfully!');
    } else {
      alert(`Restore failed: ${result.error}`);
    }
    
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    const result = await cancelSubscription();
    
    if (result.success) {
      alert('Subscription cancelled successfully.');
      setShowCancelConfirm(false);
    } else {
      alert(`Cancellation failed: ${result.error}`);
    }
    
    setLoading(false);
  };

  const getStatusColor = () => {
    switch (subscriptionStatus) {
      case 'premium': return 'text-green-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (subscriptionStatus) {
      case 'premium': return CheckCircle;
      case 'expired': return AlertCircle;
      default: return Crown;
    }
  };

  const getStatusText = () => {
    switch (subscriptionStatus) {
      case 'premium': return 'Active Premium';
      case 'expired': return 'Expired';
      default: return 'Free Plan';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              isPremium ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {React.createElement(getStatusIcon(), {
                className: `h-6 w-6 ${getStatusColor()}`
              })}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
              <p className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
          
          {!isPremium && (
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
            >
              Upgrade Now
            </button>
          )}
        </div>

        {isPremium && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Current Plan</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{currentPlan} Premium</p>
            </div>
            
            {expirationDate && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Next Billing</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {expirationDate.toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium Benefits */}
      {isPremium && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Crown className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Premium Benefits Active</h3>
              <p className="text-blue-700">You're enjoying all premium features</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">Unlimited health tracking</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">Advanced AI conversations</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">Detailed analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">Priority support</span>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Management</h3>
        
        <div className="space-y-3">
          <button
            onClick={handleRestore}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Restore Purchases</span>
          </button>
          
          {isPremium && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Free Plan Features */}
      {!isPremium && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Free Plan Features</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">Basic health tracking (5 entries/day)</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">Limited AI conversations (3/day)</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">Basic health reports</span>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm font-medium">
              Upgrade to Premium for unlimited access and advanced features!
            </p>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Cancel Subscription</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your premium subscription? You'll lose access to all premium features.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Keep Premium
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    'Cancel Subscription'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}