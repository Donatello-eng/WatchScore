// app/index.tsx
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { configureRevenueCat } from "@/lib/revenuecat";
import { ensureSession } from "@/auth/session";
import { API_BASE } from "@/config/api";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Check network first
        const net = await Network.getNetworkStateAsync();
        const online = !!net.isConnected && net.isInternetReachable !== false;
        if (!online) {
          setOffline(true);
          return; // we’ll setReady in finally
        }

        const flag = await AsyncStorage.getItem("hasOnboarded");
        setHasOnboarded(flag === "true");

        const session = await ensureSession(API_BASE);

        await configureRevenueCat(session.clientId);
      } catch (e) {
        // optional: log / mark offline, up to you
        console.log("bootstrap error", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;
  if (offline) return <Redirect href="/offline" />;

  return hasOnboarded ? (
    <Redirect href="/feed/(tabs)/scanhistory" />
  ) : (
    <Redirect href="/onboarding/welcome" />
  );
}
