// app/_layout.tsx
import React, { useEffect } from "react";
import { Slot, SplashScreen } from "expo-router";
import { Text as RNText } from "react-native";
import {
  useFonts,
  Inter_100Thin, Inter_200ExtraLight, Inter_300Light, Inter_400Regular,
  Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { K2D_700Bold } from "@expo-google-fonts/k2d";
import { PortalProvider } from "@gorhom/portal";

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_100Thin, Inter_200ExtraLight, Inter_300Light, Inter_400Regular,
    Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    K2D_700Bold,
  });

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
    requestAnimationFrame(() => { SplashScreen.hideAsync().catch(() => {}); });
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <PortalProvider>
      <Slot />
    </PortalProvider>
  );
}