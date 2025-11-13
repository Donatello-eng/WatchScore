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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
      await asset.downloadAsync();
    }
  } catch {
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
  const heroSize = Math.min(w * 0.55, R.vh(32)); // 55% of width, capped by ~⅓ of height

  return (
    <View style={[styles.pane, { width: w }]}>
      <Image
        source={s.image}
        style={{
          width: heroSize,
          height: heroSize,
          alignSelf: "center",
          marginTop: R.vh(3),
        }}
        resizeMode="contain"
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

  const wiggleTX = React.useRef(new Animated.Value(0)).current;

  const nudge = Math.round(w * 0.1);
  const overL = Math.round(w * 0.15);

  const titleSize = R.scale(51);
  const titleLine = R.scale(61);

  React.useEffect(() => {
    guideSlides.forEach((s) => prefetchAny(s.image));
  }, []);

  React.useEffect(() => {
    indexRef.current = index;
  }, [index]);

  React.useEffect(() => {
    if (!scrollRef.current || w === 0) return;
    scrollRef.current.scrollTo({ x: indexRef.current * w, animated: false });
  }, [w]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIdx = clamp(
      Math.round(e.nativeEvent.contentOffset.x / w),
      0,
      total - 1
    );
    if (newIdx !== index) setIndex(newIdx);
    animatingRef.current = false;
  };

  const runNext = async (dir: 1 | -1) => {
    if (animatingRef.current || w === 0) return;

    if (dir > 0 && index >= total - 1) {
      try {
        await AsyncStorage.multiSet([
          ["hasOnboarded", "true"],
          ["onboardingDone", "1"],
        ]);
      } finally {
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

    const p1 = Animated.timing(wiggleTX, {
      toValue: dir > 0 ? nudge : -nudge,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    const p2 = Animated.timing(wiggleTX, {
      toValue: dir > 0 ? -overL : overL,
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

    const p3 = Animated.spring(wiggleTX, {
      toValue: 0,
      damping: 12,
      stiffness: 140,
      mass: 0.9,
      useNativeDriver: true,
    });

    p1.start(() => {
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
            resizeMode="contain"
          />
        </Pressable>

        <Dots active={index + 1} total={total} />
        <View style={{ width: 40 }} />
      </View>

      <Animated.View
        style={[
          styles.stage,
          {
            transform: [{ translateX: wiggleTX }],
          },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumEnd}
          removeClippedSubviews={false}
          snapToInterval={w || undefined}
          decelerationRate="fast"
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
            resizeMode="contain"
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

  stage: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },

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
