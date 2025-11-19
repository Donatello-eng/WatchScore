// src/lib/paywall.ts
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

const PREMIUM_ENTITLEMENT = "premium";

export async function showPremiumPaywallIfNeeded(): Promise<boolean> {
  const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PREMIUM_ENTITLEMENT,
    // offering: (await Purchases.getOfferings()).current, // optional
  });

  if (result === PAYWALL_RESULT.NOT_PRESENTED) {
    // RC decided there was no need to show a paywall (user already premium)
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[PREMIUM_ENTITLEMENT];
  }

  if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[PREMIUM_ENTITLEMENT];
  }

  // ERROR or CANCELLED → not premium / unknown, treat as false
  return false;
}