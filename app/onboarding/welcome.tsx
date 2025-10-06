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
import { Font } from "../../fonts";
import { Image } from "expo-image";
import { useWindowDimensions, PixelRatio } from "react-native";

type Props = {
  onGetStarted?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
};

// Background gradient colors (typed as a readonly tuple)
const BG_COLORS = ["#FEF9F4", "#FFE1D1", "#EEC7FF", "#EEF0FF"] as const;

const HEADLINE = `Every\nwatch\ntells a\nstory.`;

type TupleColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

function useR() {
  const { width, height } = useWindowDimensions();

  // scale from a 390px baseline (iPhone 14-ish), clamped so it never goes crazy
  const s = Math.max(0.8, Math.min(1.25, width / 390));

  const scale = (n: number) => PixelRatio.roundToNearestPixel(n * s);
  const vw = (pct: number) => (width * pct) / 100; // % of screen width
  const vh = (pct: number) => (height * pct) / 100; // % of screen height

  return { width, height, scale, vw, vh };
}

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
              { fontSize: R.scale(64), lineHeight: R.scale(77) }, // ← responsive type
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
            { fontSize: R.scale(64), lineHeight: R.scale(77) }, // ← same here
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
    router.push("/onboarding/details"); // change to your next route
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
          source={require("../../assets/watch-left.webp")}
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
          source={require("../../assets/watch-right.webp")}
          style={[
            styles.watchImgRightBase,
            {
              width: R.vw(28),
              aspectRatio: 1,
              right: -R.vw(5),
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
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            //android_ripple={{ color: "rgba(255,255,255,0.15)" }}
          >
            <Text style={styles.ctaText}>Get started</Text>
          </Pressable>

          <View style={styles.legalRow}>
            <Text onPress={handleOpenTerms} style={styles.legalLink}>
              Terms of Use
            </Text>
            <Text style={styles.legalAnd}> and </Text>
            <Text onPress={handleOpenPrivacy} style={styles.legalLink}>
              Privacy Notice
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
  legalRow: {
    flexDirection: "row",
    marginTop: 16,
    alignItems: "center",
  },
  legalLink: {
    color: "#3D3D3D",
    fontSize: 12,
    fontFamily: Font.inter.regular,
  },
  legalAnd: {
    fontFamily: Font.inter.light,
    marginHorizontal: 6,
    color: "#8F8F8F",
    fontSize: 12,
  },
});
