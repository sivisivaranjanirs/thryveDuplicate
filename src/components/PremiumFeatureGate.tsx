import React, { useState } from 'react';
import { Crown, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionModal from './SubscriptionModal';

interface PremiumFeatureGateProps {
  feature: string;
  description: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PremiumFeatureGate({ 
  feature, 
  description, 
  children, 
  fallback 
}: PremiumFeatureGateProps) {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { isPremium } = useSubscription();

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Blurred content */}
        <div className="filter blur-sm pointer-events-none select-none">
          {children}
        </div>
        
        {/* Premium overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-200 max-w-sm mx-4"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
              <Crown className="h-6 w-6 text-white" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Premium Feature
            </h3>
            
            <p className="text-gray-600 text-sm mb-4">
              {description}
            </p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              <div className="flex items-center justify-center">
                <Lock className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </div>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        feature={feature}
      />
    </>
  );
}