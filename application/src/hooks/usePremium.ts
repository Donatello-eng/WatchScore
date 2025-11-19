// hooks/usePremium.ts
import { useEffect, useState } from "react";
import Purchases, { CustomerInfo } from "react-native-purchases";

export function usePremium() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const info = await Purchases.getCustomerInfo();
        if (!mounted) return;
        setIsPremium(!!info.entitlements.active.premium);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const listener = (info: CustomerInfo) => {
      if (!mounted) return;
      setIsPremium(!!info.entitlements.active.premium);
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return { loading, isPremium };
}
