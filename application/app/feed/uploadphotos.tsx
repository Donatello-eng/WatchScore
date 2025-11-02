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
  useWindowDimensions,
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

    // Slower, smoother reveal (fade + scale)
    const intro = Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: introMs,
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
  const { width, height } = useWindowDimensions();
  const [titleH, setTitleH] = React.useState(0);

  const INTRO_MS = 700;
  const frontAnim = useImageAnimations(0, INTRO_MS);
  const backAnim = useImageAnimations(200, INTRO_MS);
  const sideAnim = useImageAnimations(400, INTRO_MS);

  // Reserve space for the absolute button (no guessing on tablets)
  const [btnH, setBtnH] = React.useState(0);

  // horizontal padding that wraps the collage
  const H_PAD = vw(8);
  const V_GAP = 12; // min vertical gap between rows

  // total screen area minus safe areas
  const usableH = height - insets.top - insets.bottom;

  // keep a little breathing space above/below tiles
  const TOP_BUFFER = vh(1.5);
  const BOTTOM_BUFFER = vh(3) + btnH + 8; // your button guard

  // real space for collage block
  const availH = Math.max(
    0,
    usableH - titleH - TOP_BUFFER - BOTTOM_BUFFER
  );

  // width the collage can use
  const availW = Math.max(0, width - H_PAD * 2);

  const TILE_SCALE = 1.08;

  const TILE1_W_RATIO = 0.48;  
  const TILE2_W_RATIO = 0.66;  
  const TILE1_CAP = 392 * TILE_SCALE; // was 360
  const TILE2_CAP = 456 * TILE_SCALE; // was 420

  // tiles (height bound unchanged so it can't overflow vertically)
  const tile1 = Math.min(
    availW * TILE1_W_RATIO * TILE_SCALE,
    (availH - V_GAP) / 2,
    TILE1_CAP
  );

  const tile2 = Math.min(
    availW * TILE2_W_RATIO * TILE_SCALE,
    (availH - V_GAP) / 2,
    TILE2_CAP
  );
  const freeBelowRow1 = Math.max(0, availH - tile1 - V_GAP);

  const casebackDown = Math.min(
    tile1 * 0.36 + 10,
    freeBelowRow1 * 0.7
  );
  const sideUp = Math.min(tile1 * 0.10, availH * 0.08);
  const sideLeftPad = Math.min(availW * 0.04, 40);

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
            onLayout={e => setTitleH(e.nativeEvent.layout.height)}
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

        {/* Collage zone: fills available space between title and button */}
        <View
          style={[
            styles.collageContainer,
            {
              paddingHorizontal: H_PAD,
              paddingTop: TOP_BUFFER + sideUp,   // absorb the visual lift
              paddingBottom: BOTTOM_BUFFER,      // keeps clear of the button
            },
          ]}
        >
          {/* Row 1 */}
          <View style={[styles.row, { alignItems: "flex-start", marginBottom: V_GAP }]}>
            <Pressable
              onPress={frontAnim.onPress}
              style={[styles.cardWrap, { width: tile1, aspectRatio: 1 }]}
            >
              <Animated.View style={[ABS_FILL, styles.cardShadow, frontAnim.animatedStyle]} pointerEvents="none">
                <Image source={require("../../assets/images/front.webp")} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
              </Animated.View>
            </Pressable>

            {/* wrapper adds vertical offset and grows row height */}
            <View style={{ width: tile1, height: tile1 }}>
              <Pressable
                onPress={backAnim.onPress}
                style={[styles.cardWrap, { width: "100%", height: "100%", transform: [{ translateY: casebackDown }] }]}
              >
                <Animated.View style={[ABS_FILL, styles.cardShadow, backAnim.animatedStyle]} pointerEvents="none">
                  <Image source={require("../../assets/images/caseback.webp")} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                </Animated.View>
              </Pressable>
            </View>
          </View>

          {/* Row 2: side higher + a touch left */}
          <View style={[styles.row, { justifyContent: "flex-start" }]}>
            <Pressable
              onPress={sideAnim.onPress}
              style={[
                styles.cardWrap,
                {
                  width: tile2,
                  aspectRatio: 1,
                  marginLeft: -sideLeftPad,             // subtle left nudge
                  transform: [{ translateY: -sideUp }], // visual lift
                  alignSelf: "flex-start",
                },
              ]}
            >
              <Animated.View style={[ABS_FILL, styles.cardShadow, sideAnim.animatedStyle]} pointerEvents="none">
                <Image source={require("../../assets/images/side.webp")} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        {/* Begin button (unchanged; just measure height) */}
        <Pressable
          onLayout={e => setBtnH(e.nativeEvent.layout.height)}
          onPress={() => { triggerHaptic("impactMedium"); router.push("/feed/camera"); }}
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
          <Text style={{ fontFamily: Font.inter.bold, fontSize: scale(22), color: "#FFFFFF" }}>Begin</Text>
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={{ position: "absolute", right: scale(18), width: scale(20), height: scale(20), tintColor: "#FFFFFF", transform: [{ rotate: "180deg" }] }}
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

  // Collage fills the vertical gap and keeps clear of the Begin button
  collageContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Not absolute anymore; we let flex layout manage positioning
  cardWrap: {
    borderRadius: 12,
    overflow: "visible",
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
