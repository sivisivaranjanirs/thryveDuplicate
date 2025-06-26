import React, { useState } from 'react';
import { 
  Crown, 
  Check, 
  X, 
  Loader2, 
  Star, 
  Zap, 
  Shield, 
  TrendingUp,
  Users,
  MessageSquare,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '../hooks/useSubscription';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string; // The feature that triggered the modal
}

export default function SubscriptionModal({ isOpen, onClose, feature }: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const { offerings, purchasePackage, loading } = useSubscription();

  const premiumFeatures = [
    {
      icon: Activity,
      title: 'Unlimited Health Tracking',
      description: 'Track unlimited health metrics with advanced analytics',
      color: 'text-blue-600'
    },
    {
      icon: MessageSquare,
      title: 'Advanced AI Conversations',
      description: 'Unlimited AI health consultations with memory',
      color: 'text-green-600'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Detailed health trends and predictive insights',
      color: 'text-purple-600'
    },
    {
      icon: Users,
      title: 'Family Health Sharing',
      description: 'Share health data with unlimited family members',
      color: 'text-orange-600'
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: '24/7 premium customer support',
      color: 'text-red-600'
    },
    {
      icon: Zap,
      title: 'Early Access',
      description: 'Get new features before anyone else',
      color: 'text-yellow-600'
    }
  ];

  const handlePurchase = async () => {
    if (!offerings.length) return;
    
    setPurchasing(true);
    
    const defaultOffering = offerings[0];
    const packageToPurchase = defaultOffering.availablePackages.find(
      pkg => pkg.packageType === (selectedPlan === 'monthly' ? 'MONTHLY' : 'ANNUAL')
    );
    
    if (packageToPurchase) {
      const result = await purchasePackage(packageToPurchase);
      
      if (result.success) {
        onClose();
        // Show success message
        alert('Welcome to Thryve Premium! 🎉');
      } else {
        alert(`Purchase failed: ${result.error}`);
      }
    }
    
    setPurchasing(false);
  };

  if (!isOpen) return null;

  const defaultOffering = offerings[0];
  const monthlyPackage = defaultOffering?.availablePackages.find(pkg => pkg.packageType === 'MONTHLY');
  const annualPackage = defaultOffering?.availablePackages.find(pkg => pkg.packageType === 'ANNUAL');

  const monthlyPrice = monthlyPackage?.product.price || 9.99;
  const annualPrice = annualPackage?.product.price || 99.99;
  const monthlyEquivalent = annualPrice / 12;
  const savings = Math.round(((monthlyPrice - monthlyEquivalent) / monthlyPrice) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white rounded-t-2xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
                <Crown className="h-8 w-8 text-yellow-300" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Upgrade to Premium</h2>
              <p className="text-blue-100 text-lg">
                {feature 
                  ? `Unlock ${feature} and all premium features`
                  : 'Unlock the full potential of your health journey'
                }
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Plan Selection */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">Choose Your Plan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Monthly Plan */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan('monthly')}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === 'monthly'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Monthly</h4>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedPlan === 'monthly'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPlan === 'monthly' && (
                        <Check className="h-3 w-3 text-white m-0.5" />
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">${monthlyPrice}</span>
                      <span className="text-gray-600 ml-1">/month</span>
                    </div>
                    {monthlyPackage?.product.introPrice && (
                      <p className="text-sm text-green-600 font-medium">
                        First month: {monthlyPackage.product.introPrice.priceString}
                      </p>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm">Perfect for trying out premium features</p>
                </motion.div>

                {/* Annual Plan */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan('annual')}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === 'annual'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Popular Badge */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Annual</h4>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedPlan === 'annual'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPlan === 'annual' && (
                        <Check className="h-3 w-3 text-white m-0.5" />
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">${annualPrice}</span>
                      <span className="text-gray-600 ml-1">/year</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600">
                        ${monthlyEquivalent.toFixed(2)}/month
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        Save {savings}%
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm">Best value for committed health tracking</p>
                </motion.div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Premium Features</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {premiumFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg bg-gray-50 flex-shrink-0`}>
                        <feature.icon className={`h-5 w-5 ${feature.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm">{feature.title}</h4>
                        <p className="text-gray-600 text-xs mt-1">{feature.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Social Proof */}
            <div className="mb-8 bg-gray-50 rounded-lg p-6">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 font-medium mb-2">
                  "Thryve Premium transformed my health tracking experience!"
                </p>
                <p className="text-gray-600 text-sm">
                  Join thousands of users who've upgraded their health journey
                </p>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePurchase}
                disabled={purchasing || loading}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
                  selectedPlan === 'annual'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {purchasing ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Crown className="h-5 w-5 mr-2" />
                    Start Premium - {selectedPlan === 'monthly' ? `$${monthlyPrice}/month` : `$${annualPrice}/year`}
                  </div>
                )}
              </motion.button>
              
              <p className="text-center text-xs text-gray-500">
                Cancel anytime. No hidden fees. 7-day money-back guarantee.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}