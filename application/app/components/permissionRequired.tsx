// components/PermissionRequired.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  Animated,
  Easing,
  GestureResponderEvent,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// ⬇️ Adjust paths to match your app structure
import { Font } from "../../hooks/fonts";
import { triggerHaptic } from "../../hooks/haptics";

export type PermissionResult = {
  granted: boolean;
  canAskAgain?: boolean;
};

type Props = {
  /** Texts / copy */
  title?: string;
  subtitle?: string;
  /** Labels */
  primaryLabelAllow?: string;
  primaryLabelSettings?: string;
  secondaryLabel?: string;
  /** UI */
  gradientColors?: [string, string, string];
  containerStyle?: ViewStyle;
  cardStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  /** Logic */
  canAskAgain?: boolean; // if false → primary becomes “Open Settings”
  onRequestPermission: () => Promise<PermissionResult>;
  onOpenSettings?: () => Promise<void> | void;
  onShowHelp?: (e: GestureResponderEvent) => void;
};

const DEFAULT_GRADIENT: [string, string, string] = [
  "#FFFFFF",
  "#F3DCDD",
  "#E1C7E6",
];

export default function PermissionRequired({
  title = "Camera access needed",
  subtitle = "We use your camera to capture watch photos. You can change this anytime in Settings.",
  primaryLabelAllow = "Allow Camera",
  primaryLabelSettings = "Open Settings",
  secondaryLabel = "Open Settings",
  gradientColors = DEFAULT_GRADIENT,
  containerStyle,
  cardStyle,
  titleStyle,
  subtitleStyle,
  canAskAgain,
  onRequestPermission,
  onOpenSettings,
  onShowHelp,
}: Props) {
  // Intro animation
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    fade.setValue(0);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 160,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale]);

  const isPromptAvailable = canAskAgain !== false; // undefined => assume we can still prompt

  const openSettings = async () => {
    try {
      if (onOpenSettings) await onOpenSettings();
      else await Linking.openSettings();
    } catch (e) {
      console.warn("openSettings error", e);
    }
  };

  const handlePrimaryPress = async () => {
    triggerHaptic("impactMedium");

    // If the OS cannot show the prompt anymore, go straight to Settings
    if (!isPromptAvailable) {
      await openSettings();
      return;
    }

    try {
      const res = await onRequestPermission();
      // If still not granted and we can no longer prompt → Settings
      if (!res?.granted && res?.canAskAgain === false) {
        await openSettings();
      }
    } catch (e) {
      console.warn("requestPermission error", e);
    }
  };

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.container, containerStyle]}>
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            { opacity: fade, transform: [{ scale }] },
          ]}
        >
          {/* Icon badge */}
          <View style={styles.badge}>
            <LinearGradient
              colors={["#313131", "#111111"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badgeGradient}
            >
              <Ionicons name="camera" size={24} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={[styles.title, titleStyle]} allowFontScaling={false}>
            {title}
          </Text>

          <Text
            style={[styles.subtitle, subtitleStyle]}
            allowFontScaling={false}
          >
            {subtitle}
          </Text>

          {/* Primary */}
          <Pressable
            onPress={handlePrimaryPress}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            android_ripple={{
              color: "rgba(255,255,255,0.15)",
              borderless: false,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isPromptAvailable ? primaryLabelAllow : primaryLabelSettings
            }
          >
            <Text style={styles.primaryText} allowFontScaling={false}>
              {isPromptAvailable ? primaryLabelAllow : primaryLabelSettings}
            </Text>
            <Ionicons
              name={isPromptAvailable ? "chevron-forward" : "settings-outline"}
              size={18}
              color="#FFFFFF"
              style={{ marginLeft: 6 }}
            />
          </Pressable>

          {/* Secondary — only if the prompt is still available, otherwise primary already is "Open Settings" */}
          {isPromptAvailable && (
            <Pressable
              onPress={openSettings}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
            >
              <Ionicons
                name="settings-outline"
                size={18}
                color="#2E39FF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.secondaryText} allowFontScaling={false}>
                {secondaryLabel}
              </Text>
            </Pressable>
          )}

          {/* Helper line (optional) */}
          <Text
            style={styles.helper}
            allowFontScaling={false}
            onPress={onShowHelp}
          >
            Tip: If you selected “Don’t ask again”, use{" "}
            <Text style={styles.helperStrong}>Open Settings</Text>.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        }
      : { elevation: 6 }),
    alignItems: "center",
  },
  badge: {
    marginBottom: 14,
  },
  badgeGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: Font.inter.bold,
    fontSize: 22,
    lineHeight: 28,
    color: "#0E0E0E",
    textAlign: "center",
    marginTop: 2,
  },
  subtitle: {
    fontFamily: Font.inter.medium,
    fontSize: 15,
    lineHeight: 22,
    color: "#5C5C5C",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#111111",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryText: {
    fontFamily: Font.inter.semiBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  secondaryBtn: {
    marginTop: 12,
    width: "100%",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "rgba(46,57,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(46,57,255,0.25)",
  },
  secondaryText: {
    fontFamily: Font.inter.semiBold,
    fontSize: 15,
    color: "#2E39FF",
  },
  helper: {
    marginTop: 12,
    fontFamily: Font.inter.medium,
    fontSize: 12.5,
    color: "#6A6A6A",
    textAlign: "center",
  },
  helperStrong: {
    fontFamily: Font.inter.semiBold,
    color: "#2E39FF",
  },
});
