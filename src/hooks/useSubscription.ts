import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

// Mock RevenueCat types for web implementation
interface PurchasesOffering {
  identifier: string;
  serverDescription: string;
  metadata: Record<string, any>;
  availablePackages: PurchasesPackage[];
}

interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: PurchasesStoreProduct;
  offeringIdentifier: string;
}

interface PurchasesStoreProduct {
  identifier: string;
  description: string;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
  introPrice?: {
    price: number;
    priceString: string;
    period: string;
    cycles: number;
  };
}

interface CustomerInfo {
  originalAppUserId: string;
  allPurchaseDates: Record<string, string>;
  activeSubscriptions: string[];
  allExpirationDates: Record<string, string>;
  entitlements: {
    active: Record<string, EntitlementInfo>;
    all: Record<string, EntitlementInfo>;
  };
}

interface EntitlementInfo {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  latestPurchaseDate: string;
  expirationDate?: string;
  store: string;
  productIdentifier: string;
}

// Mock data for development
const mockOfferings: PurchasesOffering[] = [
  {
    identifier: 'default',
    serverDescription: 'Premium Health Tracking',
    metadata: {},
    availablePackages: [
      {
        identifier: 'monthly',
        packageType: 'MONTHLY',
        offeringIdentifier: 'default',
        product: {
          identifier: 'thryve_premium_monthly',
          description: 'Unlock unlimited health tracking, AI insights, and premium features',
          title: 'Thryve Premium Monthly',
          price: 9.99,
          priceString: '$9.99',
          currencyCode: 'USD',
          introPrice: {
            price: 4.99,
            priceString: '$4.99',
            period: 'P1M',
            cycles: 1
          }
        }
      },
      {
        identifier: 'annual',
        packageType: 'ANNUAL',
        offeringIdentifier: 'default',
        product: {
          identifier: 'thryve_premium_annual',
          description: 'Unlock unlimited health tracking, AI insights, and premium features for a full year',
          title: 'Thryve Premium Annual',
          price: 99.99,
          priceString: '$99.99',
          currencyCode: 'USD'
        }
      }
    ]
  }
];

const mockCustomerInfo: CustomerInfo = {
  originalAppUserId: 'user_123',
  allPurchaseDates: {},
  activeSubscriptions: [],
  allExpirationDates: {},
  entitlements: {
    active: {},
    all: {}
  }
};

export function useSubscription() {
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Initialize RevenueCat (mock implementation for web)
  useEffect(() => {
    if (user) {
      initializeRevenueCat();
    }
  }, [user]);

  const initializeRevenueCat = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would initialize RevenueCat here
      // For web, we'll use mock data and localStorage for persistence
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Load mock offerings
      setOfferings(mockOfferings);
      
      // Load customer info from localStorage or use mock
      const savedCustomerInfo = localStorage.getItem(`thryve_customer_info_${user?.id}`);
      if (savedCustomerInfo) {
        setCustomerInfo(JSON.parse(savedCustomerInfo));
      } else {
        setCustomerInfo(mockCustomerInfo);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize subscription service');
    } finally {
      setLoading(false);
    }
  };

  const purchasePackage = async (packageToPurchase: PurchasesPackage): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Simulate purchase process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would call RevenueCat's purchase method
      // For demo purposes, we'll simulate a successful purchase
      
      const now = new Date().toISOString();
      const expirationDate = new Date();
      
      if (packageToPurchase.packageType === 'MONTHLY') {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else if (packageToPurchase.packageType === 'ANNUAL') {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }
      
      const updatedCustomerInfo: CustomerInfo = {
        ...mockCustomerInfo,
        activeSubscriptions: [packageToPurchase.product.identifier],
        allPurchaseDates: {
          [packageToPurchase.product.identifier]: now
        },
        allExpirationDates: {
          [packageToPurchase.product.identifier]: expirationDate.toISOString()
        },
        entitlements: {
          active: {
            premium: {
              identifier: 'premium',
              isActive: true,
              willRenew: true,
              periodType: packageToPurchase.packageType,
              latestPurchaseDate: now,
              expirationDate: expirationDate.toISOString(),
              store: 'web',
              productIdentifier: packageToPurchase.product.identifier
            }
          },
          all: {
            premium: {
              identifier: 'premium',
              isActive: true,
              willRenew: true,
              periodType: packageToPurchase.packageType,
              latestPurchaseDate: now,
              expirationDate: expirationDate.toISOString(),
              store: 'web',
              productIdentifier: packageToPurchase.product.identifier
            }
          }
        }
      };
      
      setCustomerInfo(updatedCustomerInfo);
      
      // Save to localStorage
      if (user) {
        localStorage.setItem(`thryve_customer_info_${user.id}`, JSON.stringify(updatedCustomerInfo));
      }
      
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Purchase failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would call RevenueCat's restore method
      // For demo, we'll check localStorage
      if (user) {
        const savedCustomerInfo = localStorage.getItem(`thryve_customer_info_${user.id}`);
        if (savedCustomerInfo) {
          const restoredInfo = JSON.parse(savedCustomerInfo);
          setCustomerInfo(restoredInfo);
          return { success: true };
        }
      }
      
      return { success: false, error: 'No purchases to restore' };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Restore failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Simulate cancellation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (customerInfo) {
        const updatedCustomerInfo: CustomerInfo = {
          ...customerInfo,
          activeSubscriptions: [],
          entitlements: {
            active: {},
            all: customerInfo.entitlements.all
          }
        };
        
        setCustomerInfo(updatedCustomerInfo);
        
        if (user) {
          localStorage.setItem(`thryve_customer_info_${user.id}`, JSON.stringify(updatedCustomerInfo));
        }
      }
      
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Cancellation failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const isPremium = (): boolean => {
    return customerInfo?.entitlements.active.premium?.isActive ?? false;
  };

  const getSubscriptionStatus = (): 'free' | 'premium' | 'expired' => {
    if (!customerInfo) return 'free';
    
    const premiumEntitlement = customerInfo.entitlements.active.premium;
    if (premiumEntitlement?.isActive) {
      return 'premium';
    }
    
    // Check if there was a previous subscription that expired
    const allPremium = customerInfo.entitlements.all.premium;
    if (allPremium && !allPremium.isActive) {
      return 'expired';
    }
    
    return 'free';
  };

  const getExpirationDate = (): Date | null => {
    const premiumEntitlement = customerInfo?.entitlements.active.premium;
    if (premiumEntitlement?.expirationDate) {
      return new Date(premiumEntitlement.expirationDate);
    }
    return null;
  };

  const getCurrentPlan = (): string | null => {
    const premiumEntitlement = customerInfo?.entitlements.active.premium;
    if (premiumEntitlement?.isActive) {
      return premiumEntitlement.periodType === 'MONTHLY' ? 'Monthly' : 'Annual';
    }
    return null;
  };

  return {
    offerings,
    customerInfo,
    loading,
    error,
    purchasePackage,
    restorePurchases,
    cancelSubscription,
    isPremium: isPremium(),
    subscriptionStatus: getSubscriptionStatus(),
    expirationDate: getExpirationDate(),
    currentPlan: getCurrentPlan(),
  };
}