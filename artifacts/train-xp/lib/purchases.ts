import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Purchases, { type CustomerInfo, type PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';

// Configuration keys - can be supplied via EXPO_PUBLIC_* env vars
const API_KEY_APPLE = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || '';
const API_KEY_GOOGLE = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || '';

export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_POLICY_URL = 'https://trainxp.vercel.app/privacy';

export const PRO_ENTITLEMENT_ID = 'trainxp_pro';

let isConfigured = false;

export async function initPurchases(userId?: string): Promise<boolean> {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    (Constants as any).appOwnership === 'expo';

  if (isExpoGo || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
    // Native IAP stores are unavailable inside Expo Go / Web without native dev client
    return false;
  }

  const apiKey = Platform.OS === 'ios' ? API_KEY_APPLE : API_KEY_GOOGLE;
  if (!apiKey) {
    // Graceful fallback for local development without keys
    return false;
  }

  if (isConfigured) {
    if (userId) {
      await syncPurchasesUser(userId);
    }
    return true;
  }

  try {
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    await Purchases.configure({
      apiKey,
      appUserID: userId,
    });
    isConfigured = true;
    return true;
  } catch (error) {
    console.warn('[Purchases] Failed to configure RevenueCat:', error);
    return false;
  }
}

export function setupPurchasesListener(onProStatusChange: (isPro: boolean) => void): () => void {
  if (!isConfigured) {
    return () => {};
  }

  const listener = (customerInfo: CustomerInfo) => {
    const isPro = Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
    onProStatusChange(isPro);
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function syncPurchasesUser(userId: string): Promise<void> {
  if (!isConfigured || !userId) return;
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.warn('[Purchases] logIn notice:', err);
  }
}

export async function logOutPurchases(): Promise<void> {
  if (!isConfigured) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn('[Purchases] logOut notice:', err);
  }
}

export interface PackageDisplay {
  id: 'annual' | 'monthly' | 'weekly';
  rcPackage?: PurchasesPackage;
  title: string;
  priceString: string;
  periodText: string;
  perMonthPrice?: string;
  strikePrice?: string;
  badge?: string;
  discountPct?: string;
  hasTrial?: boolean;
}

export async function fetchOfferings(): Promise<{
  annual: PackageDisplay;
  monthly: PackageDisplay;
  weekly: PackageDisplay;
}> {
  const fallbackAnnual: PackageDisplay = {
    id: 'annual',
    title: 'Yearly Plan',
    priceString: '—',
    periodText: '/ year',
    hasTrial: false,
  };

  const fallbackMonthly: PackageDisplay = {
    id: 'monthly',
    title: 'Monthly Plan',
    priceString: '—',
    periodText: '/ month',
    hasTrial: false,
  };

  const fallbackWeekly: PackageDisplay = {
    id: 'weekly',
    title: 'Weekly Plan',
    priceString: '—',
    periodText: '/ week',
    hasTrial: false,
  };

  if (!isConfigured) {
    return { annual: fallbackAnnual, monthly: fallbackMonthly, weekly: fallbackWeekly };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      return { annual: fallbackAnnual, monthly: fallbackMonthly, weekly: fallbackWeekly };
    }

    const rcAnnual = current.annual;
    const rcMonthly = current.monthly;
    const rcWeekly = current.weekly;

    return {
      annual: rcAnnual
        ? {
            id: 'annual',
            rcPackage: rcAnnual,
            title: rcAnnual.product.title || 'Yearly Plan',
            priceString: rcAnnual.product.priceString,
            periodText: '/ year',
            perMonthPrice: new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: rcAnnual.product.currencyCode,
            }).format(rcAnnual.product.price / 12),
            badge: 'BEST VALUE',
            discountPct: '75%',
            hasTrial: false,
          }
        : fallbackAnnual,
      monthly: rcMonthly
        ? {
            id: 'monthly',
            rcPackage: rcMonthly,
            title: rcMonthly.product.title || 'Monthly Plan',
            priceString: rcMonthly.product.priceString,
            periodText: '/ month',
            badge: 'FLEXIBLE',
            hasTrial: false,
          }
        : fallbackMonthly,
      weekly: rcWeekly
        ? {
            id: 'weekly',
            rcPackage: rcWeekly,
            title: rcWeekly.product.title || 'Weekly Plan',
            priceString: rcWeekly.product.priceString,
            periodText: '/ week',
            badge: 'WEEKLY',
            hasTrial: false,
          }
        : fallbackWeekly,
    };
  } catch (error) {
    console.warn('[Purchases] Failed to fetch offerings, using fallback:', error);
    return { annual: fallbackAnnual, monthly: fallbackMonthly, weekly: fallbackWeekly };
  }
}

export async function purchaseSubscription(pkg: PackageDisplay): Promise<boolean> {
  if (!isConfigured || !pkg.rcPackage) return false;

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.rcPackage);
    return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  } catch (error: any) {
    if (!error.userCancelled) {
      throw error;
    }
    return false;
  }
}

export async function restoreSubscription(): Promise<boolean> {
  if (!isConfigured) {
    // No keys configured in mock mode
    return false;
  }

  try {
    const customerInfo: CustomerInfo = await Purchases.restorePurchases();
    return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  } catch (error) {
    console.warn('[Purchases] Restore error:', error);
    throw error;
  }
}

export async function checkHasProEntitlement(): Promise<boolean> {
  if (!isConfigured) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  } catch {
    return false;
  }
}
