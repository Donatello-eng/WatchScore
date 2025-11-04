// app/onboarding/welcome.tsx
import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Linking,
  StatusBar,
  ColorValue,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import { triggerHaptic } from "../../hooks/haptics";
import { FloatingWatchLeft, FloatingWatchRight } from "@/components/utils/floatingWatch";

type Props = {
  onGetStarted?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
};

// Background gradient colors (typed as a readonly tuple)
const BG_COLORS = ["#FEF9F4", "#FFE1D1", "#EEC7FF", "#EEF0FF"] as const;

const HEADLINE = `Every\nwatch\ntells a\nstory.`;

type TupleColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

// Make an Animated version of Expo Image
const AnimatedImage = Animated.createAnimatedComponent(Image);

const Welcome: React.FC<Props> = ({
  onGetStarted,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const R = useR();

  // --- Floating animations ---
  const leftProg = useRef(new Animated.Value(0)).current;
  const rightProg = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Helper to run a yoyo loop
    const loopYoyo = (val: Animated.Value, duration = 2600, delay = 0) => {
      const seq = Animated.sequence([
        Animated.timing(val, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(val, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      // Smooth, infinite float
      Animated.loop(seq, { resetBeforeIteration: true }).start();
    };

    // Slightly different tempo/phase so they don't move in sync
    loopYoyo(leftProg, 2800, 0);
    loopYoyo(rightProg, 2800, 300);
  }, [leftProg, rightProg]);

  // Map progress → motion
  const leftTranslateY = leftProg.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -R.scale(15)], // up to ~10px up
  });
  const leftRotate = leftProg.interpolate({
    inputRange: [0, 1],
    outputRange: ["-2.5deg", "2.5deg"],
  });

  const rightTranslateY = rightProg.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -R.scale(15)], // slightly smaller float
  });
  const rightRotate = rightProg.interpolate({
    inputRange: [0, 1],
    outputRange: ["2.5deg", "-2.5deg"], // opposite direction for variety
  });

  // One gradient for the entire phrase
  const SingleGradientHeadline = () => (
    <MaskedView
      maskElement={
        <View>
          <Text
            style={[
              styles.h1,
              { fontSize: R.scale(67), lineHeight: R.scale(80) },
            ]}
            allowFontScaling={false}
          >
            {HEADLINE}
          </Text>
        </View>
      }
    >
      <LinearGradient
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        colors={["#FE2D2D", "#4F1CB4"] as const}
      >
        {/* Invisible text sets the gradient’s draw area */}
        <Text
          style={[
            styles.h1,
            styles.h1Invisible,
            { fontSize: R.scale(67), lineHeight: R.scale(80) },
          ]}
          allowFontScaling={false}
        >
          {HEADLINE}
        </Text>
      </LinearGradient>
    </MaskedView>
  );

  const handleGetStarted = () => {
    if (onGetStarted) return onGetStarted();
    router.push({ pathname: "/onboarding/guide", params: { i: "0" } });
  };

  const handleOpenTerms = () => {
    if (onOpenTerms) return onOpenTerms();
    Linking.openURL("https://bump.games/terms");
  };

  const handleOpenPrivacy = () => {
    if (onOpenPrivacy) return onOpenPrivacy();
    Linking.openURL("https://bump.games/privacy");
  };

  return (
    <LinearGradient
      colors={BG_COLORS}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar barStyle="dark-content" />

        {/* Brand */}
        <Text style={styles.brand}>WatchScore</Text>

        {/* Decorative watches with floating animation */}
        <FloatingWatchLeft
          source={require("../../assets/images/watch-left.webp")}
          width={R.vw(34)}
          aspectRatio={1}
          floatPx={R.scale(15)}
          rotateRangeDeg={5}
          durationMs={2800}
          delayMs={0}
          containerStyle={{ top: R.vh(12), left: -R.vw(3) }}
        />
        <FloatingWatchRight
          source={require("../../assets/images/watch-right.webp")}
          width={R.vw(28)}
          aspectRatio={1}
          floatPx={R.scale(15)}
          rotateRangeDeg={5}
          durationMs={2800}
          delayMs={300}
          containerStyle={{ right: -R.vw(2), bottom: R.vh(40) }}
        />

        {/* Centered headline area */}
        <View style={styles.center}>
          <View style={styles.headlineWrap}>
            <SingleGradientHeadline />
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <Pressable
            onPress={() => {
              triggerHaptic("impactMedium");
              handleGetStarted();
            }}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.ctaText}>Get started</Text>
          </Pressable>

          <View style={styles.legalColumn}>
            <Text style={styles.legalIntro}>
              By continuing you're accepting our
            </Text>

            <Text style={styles.legalLine}>
              <Text
                onPress={() => {
                  triggerHaptic("impactMedium");
                  handleOpenTerms();
                }}
                style={styles.legalLink}
                accessibilityRole="link"
              >
                Terms of Use
              </Text>
              <Text style={styles.legalAnd}> and </Text>
              <Text
                onPress={() => {
                  triggerHaptic("impactMedium");
                  handleOpenPrivacy();
                }}
                style={styles.legalLink}
                accessibilityRole="link"
              >
                Privacy Notice
              </Text>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },

  brand: {
    fontFamily: Font.K2,
    fontSize: 20,
    letterSpacing: 0,
    color: "#000000",
    marginTop: 35,
    alignSelf: "center",
  },

  // Center stack
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  headlineWrap: {
    alignItems: "center",
  },

  h1: {
    fontFamily: Font.inter.extraBold,
    letterSpacing: 0,
    textAlign: "center",
  },
  h1Invisible: {
    opacity: 0,
  },

  // Images
  watchImgLeftBase: { position: "absolute" },
  watchImgRightBase: { position: "absolute" },

  // CTA + legal
  ctaWrap: {
    marginTop: "auto",
    alignItems: "center",
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: "#1D1D1D",
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 36,
    minWidth: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: Font.inter.bold,
    letterSpacing: 0.25,
  },
  legalColumn: {
    flexDirection: "column",
    marginTop: 16,
    alignItems: "center",
  },
  legalIntro: {
    fontSize: 12,
    lineHeight: 16,
    color: "#5b5b5bff",
    textAlign: "center",
    fontFamily: Font.inter.regular,
  },
  legalLine: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: "#5b5b5bff",
    textAlign: "center",
  },
  legalLink: {
    color: "#000000ff",
    fontSize: 12,
    fontFamily: Font.inter.regular,
  },
  legalAnd: {
    color: "#666",
    marginHorizontal: 6,
    fontSize: 12,
    fontFamily: Font.inter.light,
  },
});
