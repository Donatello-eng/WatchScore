// app/_layout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Slot, SplashScreen } from "expo-router";
import { Text as RNText } from "react-native";
import { PortalProvider } from "@gorhom/portal";
import { useFonts, Inter_100Thin, Inter_200ExtraLight, Inter_300Light, Inter_400Regular,
  Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { K2D_700Bold } from "@expo-google-fonts/k2d";
import { useWarmWatchesOnBoot, takeBootRows } from "@/hooks/useWarmWatchesOnBoot";

void SplashScreen.preventAutoHideAsync().catch(() => {});

const ABOVE_FOLD = 6;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_100Thin, Inter_200ExtraLight, Inter_300Light, Inter_400Regular,
    Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, K2D_700Bold,
  });

  // Warm bytes + choose boot rows (your existing fetch/snapshot logic)
  const warmed = useWarmWatchesOnBoot(Math.max(ABOVE_FOLD, 10), 1200);

  useEffect(() => {
    if (!fontsLoaded) return;
    const TextAny = RNText as any;
    if (!TextAny.__patchedFont) {
      TextAny.defaultProps = TextAny.defaultProps || {};
      const prev = TextAny.defaultProps.style;
      TextAny.defaultProps.style = [
        ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
        { fontFamily: "Inter_400Regular" },
      ];
      TextAny.__patchedFont = true;
    }
    if (fontsLoaded && warmed) {
      requestAnimationFrame(() => { SplashScreen.hideAsync().catch(() => {}); });
    }
  }, [fontsLoaded, warmed]);

  if (!fontsLoaded) return null; // fonts gate only

  return (
    <PortalProvider>
      {fontsLoaded && warmed ? <Slot /> : null}
    </PortalProvider>
  );
}
