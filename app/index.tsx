// app/index.tsx
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const flag = await AsyncStorage.getItem("hasOnboarded");
      setHasOnboarded(flag === "true");
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return hasOnboarded ? (
    <Redirect href="/(tabs)/feed" /> // or your actual home route
  ) : (
    <Redirect href="/onboarding/welcome" />
  );
}
