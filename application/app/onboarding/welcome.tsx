// app/onboarding/welcome.tsx
import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Linking,
  StatusBar,
  ColorValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useWindowDimensions, PixelRatio } from "react-native";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import { triggerHaptic } from "../../hooks/haptics";

type Props = {
  onGetStarted?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
};

// Background gradient colors (typed as a readonly tuple)
const BG_COLORS = ["#FEF9F4", "#FFE1D1", "#EEC7FF", "#EEF0FF"] as const;

const HEADLINE = `Every\nwatch\ntells a\nstory.`;

type TupleColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

const Welcome: React.FC<Props> = ({
  onGetStarted,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const R = useR();
  // One gradient for the entire phrase
  const SingleGradientHeadline = () => (
    <MaskedView
      maskElement={
        <View>
          <Text
            style={[
              styles.h1,
              { fontSize: R.scale(67), lineHeight: R.scale(80) }, // ← responsive type
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
        // one gradient across all lines
        colors={["#FE2D2D", "#4F1CB4"] as const}
      >
        {/* Invisible text sets the gradient’s draw area */}
        <Text
          style={[
            styles.h1,
            styles.h1Invisible,
            { fontSize: R.scale(67), lineHeight: R.scale(80) }, // ← same here
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
    // navigate to next onboarding page or tabs
    router.push({ pathname: "/onboarding/guide", params: { i: "0" } });
    // change to your next route
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

        {/* Decorative watches */}
        <Image
          source={require("../../assets/images/watch-left.webp")}
          style={[
            styles.watchImgLeftBase,
            {
              width: R.vw(34), // 34% of screen width
              aspectRatio: 1, // keep square, height auto
              top: R.vh(12), // 12% from top
              left: -R.vw(3), // small negative offset scales with width
            },
          ]}
        />

        <Image
          source={require("../../assets/images/watch-right.webp")}
          style={[
            styles.watchImgRightBase,
            {
              width: R.vw(28),
              aspectRatio: 1,
              right: -R.vw(2),
              bottom: R.vh(40),
              transform: [{ rotate: "19.75deg" }],
            },
          ]}
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

  // NEW: box that takes remaining space and centers its children
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // stack the four words with small gaps (no marginTop here)
  headlineWrap: {
    alignItems: "center", // keep the gradient text blocks centered
  },

  h1: {
    fontFamily: Font.inter.extraBold,
    letterSpacing: 0,
    textAlign: "center", // helps on very long words / smaller screens
  },
  h1Invisible: {
    opacity: 0, // invisible copy to size the gradient area
  },

  // images: make a base style and remove hardcoded width/height/positions
  watchImgLeftBase: { position: "absolute" },
  watchImgRightBase: { position: "absolute" },

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
    // Inter Regular is global default; make CTA heavier:
    fontFamily: Font.inter.bold, // "Inter_700Bold"
    letterSpacing: 0.25,
  },
  legalColumn: {
    flexDirection: "column",
    marginTop: 16,
    alignItems: "center", // use 'flex-start' if you want left-aligned
  },

  legalIntro: {
    fontSize: 12,
    lineHeight: 16,
    color: "#5b5b5bff",
    textAlign: "center",
    fontFamily: Font.inter.regular,
  },

  // formerly "legalRow"
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
