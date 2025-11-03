// app/index.tsx
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      // Check network first
      const net = await Network.getNetworkStateAsync();
      const online = !!net.isConnected && net.isInternetReachable !== false; // treat "unknown" as online
      if (!online) {
        setOffline(true);
        setReady(true);
        return;
      }

      // Otherwise continue with onboarding flag
      const flag = await AsyncStorage.getItem("hasOnboarded");
      setHasOnboarded(flag === "true");
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  if (offline) return <Redirect href="/offline" />;

  return hasOnboarded ? (
    <Redirect href="/feed/scanhistory" />
  ) : (
    <Redirect href="/onboarding/welcome" />
  );
}
