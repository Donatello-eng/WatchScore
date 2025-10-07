// app/onboarding/guide.tsx
import React from "react";
import { StyleSheet, View, Text, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";

import { Font } from "../../fonts";
import { useR } from "../../hooks/useR";
import { Dots } from "../../ui/dots";
import { guideSlides } from "../../hooks/guideSlidesData";

export default function Guide() {
  const R = useR();
  const { i } = useLocalSearchParams<{ i?: string }>();

  const total = guideSlides.length;
  const index = Math.min(Math.max(parseInt(i ?? "0", 10) || 0, 0), total - 1);
  const slide = guideSlides[index];

  const titleSize = R.scale(51);
  const titleLine = R.scale(61);

  const goBack = () => {
    if (index > 0) {
      router.replace({
        pathname: "/onboarding/guide",
        params: { i: String(index - 1) },
      });
    } else {
      router.back();
    }
  };

  const goNext = () => {
    if (index < total - 1) {
      router.replace({
        pathname: "/onboarding/guide",
        params: { i: String(index + 1) },
      });
    } else {
      // last slide → go to your next onboarding step
      router.push("/onboarding/welcome"); // change to your route if needed
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Top row: back + dots */}
      <View style={styles.topRow}>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
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

      {/* Illustration */}
      <Image
        source={slide.image}
        style={{
          width: R.vw(65),
          aspectRatio: 1,
          alignSelf: "center",
          marginTop: R.vh(3),
        }}
      />

      {/* Headline + body */}
      <View style={{ marginTop: R.vh(4), paddingHorizontal: R.vw(22) }}>
        <Text
          style={{
            fontFamily: Font.inter.bold,
            fontSize: titleSize,
            lineHeight: titleLine,
            color: "#000",
          }}
        >
          {slide.title}
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
          {slide.body}
        </Text>
      </View>

      {/* CTA */}
      <View
        style={{
          marginTop: "auto",
          alignItems: "center",
          paddingBottom: R.vh(6),
        }}
      >
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.cta, // ← keep your original CTA style
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.ctaLabel}>Next</Text>
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={styles.nextIcon} // ← keep your original absolute icon style
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

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
    position: "relative", // <-- required
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    minWidth: 150,
    borderRadius: 36,
  },
  nextIcon: {
    position: "absolute", // <-- required
    right: 15, // tweak gap
    width: 20,
    height: 20,
    tintColor: "#fff",
    transform: [{ rotate: "180deg" }],
  },
});
