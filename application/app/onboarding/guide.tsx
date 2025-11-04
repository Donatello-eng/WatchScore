// app/onboarding/guide.tsx
import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  StatusBar,
  Animated,
  Easing,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Asset } from "expo-asset";
import { router } from "expo-router";
import { Font } from "../../hooks/fonts";
import { useR } from "../../hooks/useR";
import { Dots } from "../../ui/dots";
import { guideSlides } from "../../hooks/guideSlidesData";
import { triggerHaptic } from "../../hooks/haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** ---------- Helpers ---------- **/

// Safe prefetch for both URI strings and local require(...) numbers
async function prefetchAny(src: any): Promise<void> {
  try {
    if (!src) return;
    if (typeof src === "string") {
      await Image.prefetch(src);
      return;
    }
    if (typeof src === "number") {
      const asset = Asset.fromModule(src);
      await asset.downloadAsync(); // no-op if bundled, ensures ready
    }
  } catch {
    // swallow; prefetch is best-effort
  }
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/** ---------- Slide (memoized) ---------- **/

type SlideProps = {
  i: number;
  index: number;
  w: number;
  R: ReturnType<typeof useR>;
  titleSize: number;
  titleLine: number;
  total: number;
};

const Slide = React.memo(function Slide({
  i,
  index,
  w,
  R,
  titleSize,
  titleLine,
  total,
}: SlideProps) {
  const s = guideSlides[clamp(i, 0, total - 1)];
  const hot = i === index || i === index - 1 || i === index + 1;

  return (
    <View style={[styles.pane, { width: w }]}>
      <Image
        source={s.image}
        transition={0}
        cachePolicy="memory-disk"
        priority={hot ? "high" : "normal"}
        recyclingKey={String(i)}
        style={{
          width: R.vw(65),
          aspectRatio: 1,
          alignSelf: "center",
          marginTop: R.vh(3),
        }}
      />
      <View style={{ marginTop: R.vh(4), paddingHorizontal: R.vw(22) }}>
        <Text
          style={{
            fontFamily: Font.inter.bold,
            fontSize: titleSize,
            lineHeight: titleLine,
            color: "#000",
          }}
        >
          {s.title}
        </Text>
        <Text
          style={{
            fontFamily: Font.inter.regular,
            fontSize: 12,
            lineHeight: 15,
            color: "#8F8F8F",
            marginTop: R.scale(14),
            marginBottom: R.scale(10),
          }}
        >
          {s.body}
        </Text>
      </View>
    </View>
  );
});

/** ---------- Component ---------- **/

export default function Guide() {
  const R = useR();
  const total = guideSlides.length;
  const { width: w } = useWindowDimensions();

  const [index, setIndex] = React.useState(0);
  const indexRef = React.useRef(index);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const animatingRef = React.useRef(false);

  // The tiny stage wiggle (adds the “push right → settle right” feel)
  const wiggleTX = React.useRef(new Animated.Value(0)).current;

  // Distances for the wiggle (in px)
  const nudge = Math.round(w * 0.1); // small push to the right
  const overL = Math.round(w * 0.15); // slight overshoot to the left before settling

  const titleSize = R.scale(51);
  const titleLine = R.scale(61);

  // Prefetch everything once (small slidesets are typical for onboarding)
  React.useEffect(() => {
    guideSlides.forEach((s) => prefetchAny(s.image));
  }, []);

  // Track latest index in a ref to avoid width-effect running on every index change
  React.useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Keep ScrollView positioned at the current page on width changes (e.g., rotation)
  React.useEffect(() => {
    if (!scrollRef.current || w === 0) return;
    scrollRef.current.scrollTo({ x: indexRef.current * w, animated: false });
  }, [w]);

  // Handle final index update after a native scroll
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIdx = clamp(
      Math.round(e.nativeEvent.contentOffset.x / w),
      0,
      total - 1
    );
    if (newIdx !== index) setIndex(newIdx);
    animatingRef.current = false;
  };

  // Core: programmatic page change using native scroll + tiny wiggle on the stage
  const runNext = async (dir: 1 | -1) => {
    if (animatingRef.current || w === 0) return;
    if (dir > 0 && index >= total - 1) {
      try {
        await AsyncStorage.multiSet([
          ["hasOnboarded", "true"],
          ["onboardingDone", "1"], // legacy key your offline screen checks
        ]);
      } finally {
        // navigate only after the flag is persisted
        router.replace("/feed/scanhistory");
      }
      return;
    }
    if (dir < 0 && index <= 0) {
      router.back();
      return;
    }

    animatingRef.current = true;
    const target = index + dir;
    const targetX = target * w;

    // Phase 1: tiny push right (or left for back)
    const p1 = Animated.timing(wiggleTX, {
      toValue: dir > 0 ? nudge : -nudge,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    // Phase 2: while we wiggle back past center, trigger native scroll to the target page
    const p2 = Animated.timing(wiggleTX, {
      toValue: dir > 0 ? -overL : overL,
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

    // Phase 3: soft settle back toward 0
    const p3 = Animated.spring(wiggleTX, {
      toValue: 0,
      damping: 12,
      stiffness: 140,
      mass: 0.9,
      useNativeDriver: true,
    });

    // Start phase 1, then kick off phase 2 + native scroll, then settle.
    p1.start(() => {
      // Trigger the native scroll exactly as phase 2 starts. Native handles the heavy work.
      scrollRef.current?.scrollTo({ x: targetX, y: 0, animated: true });
      p2.start(() => p3.start());
    });
  };

  const goBack = () => runNext(-1);
  const goNext = () => runNext(1);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            triggerHaptic("impactMedium");
            goBack();
          }}
          style={styles.backBtn}
        >
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={styles.backIcon}
          />
        </Pressable>

        <Dots active={index + 1} total={total} />
        <View style={{ width: 40 }} />
      </View>

      {/* Stage with tiny wiggle transform; ScrollView inside handles the page motion natively */}
      <Animated.View
        style={[
          styles.stage,
          {
            transform: [{ translateX: wiggleTX }],
            // NOTE: intentionally NOT forcing rasterization on either platform
            // to avoid layer promotion/demotion flicker at the end of the scroll.
          },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false} // we control it via buttons
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumEnd}
          // prevent clipping artefacts when pages are animating
          removeClippedSubviews={false}
          // snap settings help Android stay crisp
          snapToInterval={w || undefined}
          decelerationRate="fast"
          // IMPORTANT: do not pass contentOffset after mount; initial-only prop causes a layout nudge
        >
          {guideSlides.map((_, i) => (
            <Slide
              key={i}
              i={i}
              index={index}
              w={w}
              R={R}
              titleSize={titleSize}
              titleLine={titleLine}
              total={total}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* CTA */}
      <View
        style={{
          marginTop: "auto",
          alignItems: "center",
          paddingBottom: R.vh(6),
        }}
      >
        <Pressable
          onPress={() => {
            triggerHaptic("impactMedium");
            goNext();
          }}
          style={({ pressed }) => [
            styles.cta,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.ctaLabel}>Next</Text>
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={styles.nextIcon}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/** ---------- Styles ---------- **/

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 15,
    justifyContent: "space-between",
  },

  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    width: 40,
    height: 40,
    tintColor: "#3A3A3A",
  },

  // Stage holds the horizontally-paged content
  stage: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },

  // Each pane = full screen width
  pane: {
    height: "100%",
  },

  ctaLabel: {
    fontFamily: Font.inter.bold,
    color: "#fff",
    fontSize: 18,
    letterSpacing: 0.25,
    textAlign: "center",
    flex: 1,
  },

  cta: {
    backgroundColor: "#1D1D1D",
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    minWidth: 150,
    borderRadius: 36,
  },

  nextIcon: {
    position: "absolute",
    right: 15,
    width: 20,
    height: 20,
    tintColor: "#fff",
    transform: [{ rotate: "180deg" }],
  },
});
