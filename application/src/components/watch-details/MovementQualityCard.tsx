// components/MovementQualityCard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, ViewStyle, Animated, StyleProp } from "react-native";
import GradeRing from "../../../app/components/gradeRing";
import StatTile from "../../../app/components/statTile";
import DotsEllipsis from "@/components/loading/DotsEllipsis";

export type MovementQualityDTO = {
  movement?: string;
  scoreNumeric?: number;        // 0..100
  scoreLetter?: string;         // "A" | "B" | "C" | "D" | "-"
  accuracy?: string;
  reliability?: string;
};

export type MovementQualityCardProps = MovementQualityDTO & {
  vw: (pct: number) => number;
  scale: (n: number) => number;
  loading?: boolean;
  titleFontFamily?: string;
  style?: StyleProp<ViewStyle>;
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;

  // optional ring tuning (defaults chosen for this smaller card)
  ringSize?: number;    // px
  ringStroke?: number;  // px
};

// ---- constants aligned with OverallScoreCard behavior ----
const LOADING_RING_CYCLE_MS = 8000;   // 0→100→0 in 8s
const LOADING_RING_STEPS = 120;       // quantization to limit re-renders

// --- tiny skeleton helpers ---------------------------------------------------
function SkeletonBox({
  width, height, borderRadius = 8, style,
}: { width: number | string; height: number; borderRadius?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: "#EDEDED", opacity }, style]} />
  );
}

function StatTileSkeleton({ scale, style }: { scale: (n: number) => number; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: "#F5F5F5",
          borderRadius: 14,
          padding: scale(12),
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
    >
      <SkeletonBox width={scale(22)} height={scale(22)} borderRadius={scale(11)} />
      <View style={{ flex: 1, marginLeft: scale(10) }}>
        <SkeletonBox width={"70%"} height={scale(14)} borderRadius={6} />
        <SkeletonBox width={"40%"} height={scale(12)} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

// --- card --------------------------------------------------------------------
export default function MovementQualityCard({
  movement = "–",
  scoreNumeric = 0,
  scoreLetter = "-",
  accuracy = "–",
  reliability = "–",
  vw,
  scale,
  loading = false,
  titleFontFamily,
  style,
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
  ringSize = 86,
  ringStroke = 10,
}: MovementQualityCardProps) {
  const S = useMemo(
    () => ({
      cardMarginH: cardMarginH ?? vw(8),
      cardPadding: cardPadding ?? scale(14),
      cardRadius: cardRadius ?? scale(30),
      cardMarginT: cardMarginT ?? scale(15),

      headerSize: scale(18),
      infoSize: scale(18),

      rowGapT: scale(12),
      rowGapB: scale(10),
    }),
    [vw, scale, cardMarginH, cardPadding, cardRadius, cardMarginT]
  );

  // rAF triangle loop 0→100→0 while loading (same feel as OverallScoreCard)
  const [loopScore, setLoopScore] = useState(0);
  useEffect(() => {
    if (!loading) return; // keep last frame to avoid jump; real score replaces it below

    let raf = 0;
    const t0 = performance.now();
    const lastQ = { v: -1 }; // last quantized value to avoid redundant setState

    const tick = () => {
      const elapsed = (performance.now() - t0) % LOADING_RING_CYCLE_MS;
      const phase = (elapsed / LOADING_RING_CYCLE_MS) * 2; // 0..2
      const y01 = phase < 1 ? phase : (2 - phase);         // triangle 0→1→0

      // quantize to LOADING_RING_STEPS then map to 0..100
      const q = Math.round(y01 * LOADING_RING_STEPS);
      if (q !== lastQ.v) {
        lastQ.v = q;
        setLoopScore(Math.round((q / LOADING_RING_STEPS) * 100));
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loading]);

  const isLoading = loading || (scoreLetter === "-" && !scoreNumeric);

  // center dots sizing proportional to ring
  const dotSize = Math.max(8, Math.min(ringSize * 0.14, 12));
  const dotGap = Math.max(4, dotSize * 0.5);

  return (
    <View
      style={[
        styles.card,
        {
          marginHorizontal: S.cardMarginH,
          padding: S.cardPadding,
          borderRadius: S.cardRadius,
          marginTop: S.cardMarginT,
        },
        style,
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text
          style={{
            fontFamily: titleFontFamily,
            fontSize: S.headerSize,
            color: "#A8A8A8",
            fontWeight: titleFontFamily ? undefined : "600",
          }}
        >
          Movement Quality
        </Text>
        <Image
          source={require("../../../assets/images/info.webp")}
          style={{ width: S.infoSize, height: S.infoSize, tintColor: "#C7C7C7", marginLeft: scale(6) }}
          resizeMode="contain"
        />
      </View>

      {/* Row 1: Type + Grade ring */}
      <View style={{ flexDirection: "row", marginTop: S.rowGapT }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} style={{ alignSelf: "stretch" }} />
          ) : (
            <StatTile
              style={{ alignSelf: "stretch" }}
              value={movement}
              icon={require("../../../assets/images/type.webp")}
              label="Type"
            />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: ringSize, height: ringSize, position: "relative" }}>
            <GradeRing
              score={isLoading ? loopScore : (scoreNumeric ?? 0)}
              letter={isLoading ? "" : (scoreLetter ?? "-")} // hide "-" while loading
              baseSize={ringSize}
              baseStroke={ringStroke}
            />

            {isLoading && (
              <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                {/* Expected DotsEllipsis API: {running?, dotSize?, gap?, color?, duration?} */}
                <DotsEllipsis running dotSize={dotSize} gap={dotGap} color="#CFCFCF" duration={900} />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Row 2: Accuracy + Reliability */}
      <View style={{ flexDirection: "row", marginTop: S.rowGapB }}>
        <View style={{ flex: 1, marginRight: scale(10) }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} />
          ) : (
            <StatTile
              style={{ flex: 1 }}
              value={accuracy}
              icon={require("../../../assets/images/accuracy.webp")}
              label="Accuracy"
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} />
          ) : (
            <StatTile
              style={{ flex: 1 }}
              value={reliability}
              icon={require("../../../assets/images/reliability.webp")}
              label="Reliability"
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
  headerRow: { flexDirection: "row", alignItems: "center" },
});
