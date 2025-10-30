import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import { router } from "expo-router";
import { triggerHaptic } from "../../hooks/haptics";

const ABS_FILL: any = StyleSheet.absoluteFillObject;

/**
 * Three animations per image:
 * 1) Intro fade + scale (duration configurable via introMs)
 * 2) Idle float + micro tilt (loop)
 * 3) Press bounce (on tap)
 *
 * Includes a reset so changing introMs/staggerMs reliably replays the intro.
 */
function useImageAnimations(staggerMs = 0, introMs = 1100) {
  // 1) Intro (fade + scale)
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introScale = useRef(new Animated.Value(0.9)).current;

  // 2) Idle loop (float + tilt)
  const floatDriver = useRef(new Animated.Value(0)).current; // 0..1..0
  const tiltDriver = useRef(new Animated.Value(0)).current; // 0..1..0

  // 3) Press bounce
  const pressScale = useRef(new Animated.Value(1)).current;

  const animatedStyle = useMemo(() => {
    const translateY = floatDriver.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -6],
    });

    const rotate = tiltDriver.interpolate({
      inputRange: [0, 1],
      outputRange: ["-2deg", "2deg"],
    });

    return {
      opacity: introOpacity,
      transform: [
        { scale: introScale }, // intro
        { scale: pressScale }, // press
        { translateY }, // idle float
        { rotate }, // idle tilt
      ],
    };
  }, [floatDriver, tiltDriver, introOpacity, introScale, pressScale]);

  useEffect(() => {
    // ---- Reset values so the intro reliably replays when props change ----
    introOpacity.stopAnimation();
    introScale.stopAnimation();
    floatDriver.stopAnimation();
    tiltDriver.stopAnimation();
    pressScale.stopAnimation();

    introOpacity.setValue(0);
    introScale.setValue(0.9);
    // (idle drivers start from 0 automatically)

    // Slower, smoother reveal (fade + scale)
    const intro = Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: introMs, // increase for slower intro
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
        delay: staggerMs,
      }),
      Animated.timing(introScale, {
        toValue: 1,
        duration: introMs,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
        delay: staggerMs,
      }),
    ]);

    // Idle float loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatDriver, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatDriver, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Idle tilt loop (offset start for organic feel)
    const tiltLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tiltDriver, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tiltDriver, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    intro.start(() => {
      floatLoop.start();
      setTimeout(() => tiltLoop.start(), 250);
    });

    return () => {
      intro.stop();
      floatLoop.stop();
      tiltLoop.stop();
    };
  }, [
    introOpacity,
    introScale,
    floatDriver,
    tiltDriver,
    pressScale,
    staggerMs,
    introMs,
  ]);

  const onPress = () => {
    triggerHaptic("impactLight");
    Animated.sequence([
      Animated.timing(pressScale, {
        toValue: 0.965,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pressScale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { animatedStyle, onPress };
}

export default function UploadPhotos() {
  const insets = useSafeAreaInsets();
  const { scale, vw, vh } = useR();

  // Set a clearly slower intro for testing (e.g., 4000ms)
  const INTRO_MS = 1500;

  // Slightly larger stagger for a calm cascade
  const frontAnim = useImageAnimations(0, INTRO_MS);
  const backAnim = useImageAnimations(200, INTRO_MS);
  const sideAnim = useImageAnimations(400, INTRO_MS);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <LinearGradient
        colors={["#FFFFFF", "#FCF6EC", "#F4DDE0", "#E1C7E6"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Only left/right edges; we control top/bottom padding explicitly */}
      <SafeAreaView
        style={[
          styles.safe,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
        edges={["left", "right"]}
      >
        {/* Back chevron */}
        <Pressable
          hitSlop={12}
          onPress={() => {
            triggerHaptic("impactMedium");
            router.back();
          }}
          style={styles.backBtn}
        >
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={styles.backIcon}
          />
        </Pressable>

        {/* Big title */}
        <View style={{ paddingHorizontal: vw(20), marginTop: vh(1) }}>
          <Text
            style={{
              fontFamily: Font.inter.bold,
              fontSize: scale(44),
              lineHeight: scale(52),
              color: "#0E0E0E",
            }}
          >
            {"Please,\nupload 3\npictures of\nthe watch"}
          </Text>
        </View>

        {/* Collage zone */}
        <View>
          {/* Front */}
          <Pressable
            onPress={frontAnim.onPress}
            style={[
              styles.cardWrap,
              { width: vw(49), height: vw(49), left: vw(10), top: vh(5) },
            ]}
          >
            {/* Optional: force remount if you tweak timings during dev */}
            {/* <Animated.View key={`front-0-${INTRO_MS}`} ... /> */}
            <Animated.View
              style={[ABS_FILL, styles.cardShadow, frontAnim.animatedStyle]}
              pointerEvents="none"
            >
              <Image
                source={require("../../assets/images/front.webp")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </Animated.View>
          </Pressable>

          {/* Caseback */}
          <Pressable
            onPress={backAnim.onPress}
            style={[
              styles.cardWrap,
              { width: vw(49), height: vw(49), right: vw(0), top: vh(16) },
            ]}
          >
            {/* <Animated.View key={`back-200-${INTRO_MS}`} ... /> */}
            <Animated.View
              style={[ABS_FILL, styles.cardShadow, backAnim.animatedStyle]}
              pointerEvents="none"
            >
              <Image
                source={require("../../assets/images/caseback.webp")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </Animated.View>
          </Pressable>

          {/* Side */}
          <Pressable
            onPress={sideAnim.onPress}
            style={[
              styles.cardWrap,
              { width: vw(60), height: vw(60), right: vw(37), top: vh(27) },
            ]}
          >
            {/* <Animated.View key={`side-400-${INTRO_MS}`} ... /> */}
            <Animated.View
              style={[ABS_FILL, styles.cardShadow, sideAnim.animatedStyle]}
              pointerEvents="none"
            >
              <Image
                source={require("../../assets/images/side.webp")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* Begin button */}
        <Pressable
          onPress={() => {
            triggerHaptic("impactMedium");
            router.push("/feed/camera");
          }}
          style={({ pressed }) => [
            styles.beginBtn,
            pressed && { transform: [{ scale: 0.98 }] },
            {
              bottom: insets.bottom + vh(3),
              borderRadius: scale(40),
              paddingVertical: scale(16),
              paddingHorizontal: vw(14),
            },
          ]}
        >
          <Text
            style={{
              fontFamily: Font.inter.bold,
              fontSize: scale(22),
              color: "#FFFFFF",
            }}
          >
            Begin
          </Text>

          {/* Chevron pinned to the right, text stays centered */}
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={{
              position: "absolute",
              right: scale(18),
              width: scale(20),
              height: scale(20),
              tintColor: "#FFFFFF",
              transform: [{ rotate: "180deg" }],
            }}
            resizeMode="contain"
          />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  cardWrap: {
    position: "absolute",
  },

  // Subtle lift that complements the motion
  cardShadow: {
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }
      : { elevation: 4 }),
  },

  beginBtn: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
  },

  backBtn: {
    width: 40,
    height: 40,
    marginTop: 15,
    marginLeft: 20,
  },
  backIcon: {
    width: 40,
    height: 40,
    tintColor: "#3A3A3A",
  },
});
