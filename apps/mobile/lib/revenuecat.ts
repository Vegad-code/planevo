import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

export const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

export const PLANEVO_PRO_ENTITLEMENT_ID = 'Planevo Pro';

export const REVENUECAT_PRODUCT_IDS = {
  planevoProMonthly: 'planevo_pro_monthly',
  yearly: 'yearly',
  monthly: 'monthly',
} as const;

let configurePromise: Promise<void> | null = null;

export function hasPlanevoProEntitlement(
  customerInfo?: CustomerInfo | null
): boolean {
  return Boolean(
    customerInfo?.entitlements.active[PLANEVO_PRO_ENTITLEMENT_ID]?.isActive
  );
}

export const isPro = hasPlanevoProEntitlement;

export async function initRevenueCat(): Promise<void> {
  if (!configurePromise) {
    configurePromise = configureRevenueCat().catch((error) => {
      configurePromise = null;
      throw error;
    });
  }

  return configurePromise;
}

async function configureRevenueCat(): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_REVENUECAT_API_KEY.');
  }

  const configured = await Purchases.isConfigured().catch(() => false);
  if (configured) return;

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
}

export async function loginToRevenueCat(
  userId: string,
  email?: string | null
): Promise<CustomerInfo | null> {
  try {
    await initRevenueCat();
    const { customerInfo } = await Purchases.logIn(userId);

    if (email) {
      await Purchases.setEmail(email);
    }

    return customerInfo;
  } catch (error) {
    console.warn('[revenuecat] Failed to log in:', error);
    return null;
  }
}

export async function logoutOfRevenueCat(): Promise<CustomerInfo | null> {
  try {
    const configured = await Purchases.isConfigured().catch(() => false);
    if (!configured) return null;

    const isAnonymous = await Purchases.isAnonymous();
    if (isAnonymous) return null;

    return await Purchases.logOut();
  } catch (error) {
    console.warn('[revenuecat] Failed to log out:', error);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    await initRevenueCat();
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.warn('[revenuecat] Failed to fetch customer info:', error);
    return null;
  }
}

export function addCustomerInfoListener(
  listener: CustomerInfoUpdateListener
): () => void {
  try {
    Purchases.addCustomerInfoUpdateListener(listener);
  } catch (error) {
    console.warn('[revenuecat] Failed to attach customer info listener:', error);
    return () => undefined;
  }

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    await initRevenueCat();
    return await Purchases.getOfferings();
  } catch (error) {
    console.warn('[revenuecat] Failed to fetch offerings:', error);
    return null;
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await getOfferings();
  return offerings?.current ?? null;
}

export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  const currentOffering = await getCurrentOffering();
  return currentOffering?.availablePackages ?? [];
}

export async function purchasePackage(
  packageToBuy: PurchasesPackage
): Promise<CustomerInfo | null> {
  try {
    await initRevenueCat();
    const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
    return customerInfo;
  } catch (error: any) {
    if (!error?.userCancelled) {
      console.warn('[revenuecat] Failed to purchase package:', error);
    }

    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    await initRevenueCat();
    return await Purchases.restorePurchases();
  } catch (error) {
    console.warn('[revenuecat] Failed to restore purchases:', error);
    return null;
  }
}

export async function presentPlanevoProPaywallIfNeeded(): Promise<boolean> {
  try {
    await initRevenueCat();
    const { default: RevenueCatUI, PAYWALL_RESULT } = await import(
      'react-native-purchases-ui'
    );
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PLANEVO_PRO_ENTITLEMENT_ID,
      displayCloseButton: true,
    });

    return (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED ||
      result === PAYWALL_RESULT.NOT_PRESENTED
    );
  } catch (error) {
    console.warn('[revenuecat] Failed to present paywall:', error);
    return false;
  }
}

export async function presentPlanevoProPaywall(): Promise<boolean> {
  try {
    await initRevenueCat();
    const { default: RevenueCatUI, PAYWALL_RESULT } = await import(
      'react-native-purchases-ui'
    );
    const result = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
    });

    return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
  } catch (error) {
    console.warn('[revenuecat] Failed to present paywall:', error);
    return false;
  }
}

export async function presentCustomerCenter(): Promise<void> {
  await initRevenueCat();
  const { default: RevenueCatUI } = await import('react-native-purchases-ui');

  await RevenueCatUI.presentCustomerCenter({
    callbacks: {
      onRestoreCompleted: ({ customerInfo }) => {
        if (hasPlanevoProEntitlement(customerInfo)) {
          console.info('[revenuecat] Planevo Pro restored.');
        }
      },
      onRestoreFailed: ({ error }) => {
        console.warn('[revenuecat] Customer Center restore failed:', error);
      },
    },
  });
}
