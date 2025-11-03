// app/offline.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { triggerHaptic } from "hooks/haptics";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HOME_ROUTE = "/feed/scanhistory"; // <- match your app/index.tsx
const ONBOARDING_ROUTE = "/onboarding/welcome"; // <- match your app/index.tsx

async function getHasOnboarded(): Promise<boolean> {
  // Prefer the key used in app/index.tsx
  const flag = await AsyncStorage.getItem("hasOnboarded");
  if (flag != null) return flag === "true";

  // Fallback for older codepaths that used "onboardingDone"
  const done = await AsyncStorage.getItem("onboardingDone");
  // accept "1" or "2" as “done” to be safe
  return done === "1" || done === "2";
}

export default function OfflineScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const tryAgain = useCallback(async () => {
    setChecking(true);
    const net = await Network.getNetworkStateAsync();
    const online = !!net.isConnected && net.isInternetReachable !== false; // unknown => treat as online

    if (!online) {
      setChecking(false);
      return;
    }

    const onboarded = await getHasOnboarded();
    router.replace(onboarded ? HOME_ROUTE : ONBOARDING_ROUTE);
  }, [router]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>You’re offline</Text>
      <Text style={styles.subtitle}>Check your connection and try again.</Text>

      <Pressable
        style={styles.btn}
        onPress={() => {
          triggerHaptic("impactMedium");
          tryAgain();
        }}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.btnText}>Try again</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#20201E" },
  subtitle: { fontSize: 16, color: "#444", textAlign: "center" },
  btn: {
    marginTop: 8,
    backgroundColor: "#262626",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
