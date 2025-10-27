import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View, ImageSourcePropType, Animated, Dimensions } from "react-native";
import GradeRing from "../../../app/components/gradeRing";

type OverallScoreCardProps = {
  score: number;
  letter: string;
  conclusion?: string;
  vw: (pct: number) => number;
  scale: (n: number) => number;
  loading?: boolean;                         // drives ring + dots loading
  titleFontFamily?: string;
  bodyFontFamily?: string;
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;
  infoIcon?: ImageSourcePropType;
  loupeIcon?: ImageSourcePropType;
};

// --- Fixed visuals (no external inputs) ---
const RING_SIZE = 156;
const RING_STROKE = 20;
const RING_LABEL_FONT_SIZE = 35;
// Slower loading cycle (0→100→0) = 8s
const LOADING_RING_CYCLE_MS = 8000;

// --- pulsing "..." loader for the center label ---
function DotsEllipsis({
  dotSize = 12,
  gap = 6,
  baseOpacity = 0.35,
  peakOpacity = 1,
  duration = 900,
}: {
  dotSize?: number;
  gap?: number;
  baseOpacity?: number;
  peakOpacity?: number;
  duration?: number;
}) {
  const o1 = useRef(new Animated.Value(baseOpacity)).current;
  const o2 = useRef(new Animated.Value(baseOpacity)).current;
  const o3 = useRef(new Animated.Value(baseOpacity)).current;

  // one pulsing loop per dot, offset by a phase delay
  const makeLoop = (val: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: peakOpacity, duration: duration / 2, useNativeDriver: true }),
        Animated.timing(val, { toValue: baseOpacity, duration: duration / 2, useNativeDriver: true }),
      ])
    );

  useEffect(() => {
    const loops = [
      makeLoop(o1, 0),
      makeLoop(o2, duration / 3),
      makeLoop(o3, (2 * duration) / 3),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [o1, o2, o3, duration, baseOpacity, peakOpacity]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          marginHorizontal: gap / 2, backgroundColor: "#CFCFCF", opacity: o1,
        }}
      />
      <Animated.View
        style={{
          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          marginHorizontal: gap / 2, backgroundColor: "#CFCFCF", opacity: o2,
        }}
      />
      <Animated.View
        style={{
          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          marginHorizontal: gap / 2, backgroundColor: "#CFCFCF", opacity: o3,
        }}
      />
    </View>
  );
}

export default function OverallScoreCard({
  score,
  letter,
  conclusion = "—",
  vw,
  scale,
  loading = false,
  titleFontFamily,
  bodyFontFamily,
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
  infoIcon = require("../../../assets/images/info.webp"),
  loupeIcon = require("../../../assets/images/loupe.webp"),
}: OverallScoreCardProps) {
  const S = useMemo(
    () => ({
      cardMarginH: cardMarginH ?? vw(8),
      cardPadding: cardPadding ?? scale(14),
      cardRadius: cardRadius ?? scale(30),
      cardMarginT: cardMarginT ?? scale(15),
      headerSize: scale(18),
      infoSize: scale(20),
      bubbleRadius: scale(14),
      bubblePad: scale(12),
      loupeSize: scale(16),
      loupeMarginTop: scale(2),
      loupeMarginRight: scale(8),
      bodySize: scale(12),
      bodyLine: scale(18),
      ringTop: scale(20),
      bubbleTop: scale(20),
    }),
    [vw, scale, cardMarginH, cardPadding, cardRadius, cardMarginT]
  );

  // Smooth, adjustable-speed loading loop using rAF + triangle wave (fixed slow cycle)
  const [loopScore, setLoopScore] = useState(0);
  useEffect(() => {
    if (!loading) { setLoopScore(0); return; }

    let raf = 0;
    const t0 = Date.now();

    const tick = () => {
      const elapsed = (Date.now() - t0) % LOADING_RING_CYCLE_MS;
      const phase = (elapsed / LOADING_RING_CYCLE_MS) * 2; // 0..2
      // Triangle wave: 0→1→0
      const y01 = phase < 1 ? phase : (2 - phase);
      // Map to 0..100 and quantize a bit to reduce re-renders
      const value = Math.round(y01 * 100);
      setLoopScore(value);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loading]);

  const isLoading = loading || (letter === "-" && !score);

  // size the dots nicely for the center
  const dotSize = useMemo(() => {
    const byLabel = RING_LABEL_FONT_SIZE * 0.42;
    const byRing = RING_SIZE * 0.12;
    return Math.max(8, Math.min(byLabel, byRing));
  }, []);
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
      ]}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={{
            fontFamily: titleFontFamily,
            fontSize: S.headerSize,
            color: "#A8A8A8",
            fontWeight: titleFontFamily ? undefined : "600",
          }}
        >
          Overall Score
        </Text>
        <Image
          source={infoIcon}
          style={{
            width: S.infoSize,
            height: S.infoSize,
            marginLeft: scale(6),
            tintColor: "#c5c5c5ff",
          }}
          resizeMode="contain"
        />
      </View>

      {/* Ring + center dots while loading */}
      <View style={{ alignItems: "center", marginTop: S.ringTop }}>
        <View style={{ width: RING_SIZE, height: RING_SIZE, position: "relative" }}>
          <GradeRing
            score={isLoading ? loopScore : (score ?? 0)}
            letter={isLoading ? "" : (letter ?? "")}  // hide "-" while loading
            baseSize={RING_SIZE}
            baseStroke={RING_STROKE}
            labelFontSize={RING_LABEL_FONT_SIZE}
          />

          {isLoading && (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}
            >
              <DotsEllipsis dotSize={dotSize} gap={dotGap} />
            </View>
          )}
        </View>
      </View>

      {/* Conclusion bubble */}
      <View
        style={{
          marginTop: S.bubbleTop,
          backgroundColor: "#F5F5F5",
          borderRadius: S.bubbleRadius,
          padding: S.bubblePad,
          flexDirection: "row",
        }}
      >
        <Image
          source={loupeIcon}
          style={{
            width: S.loupeSize,
            height: S.loupeSize,
            marginTop: S.loupeMarginTop,
            marginRight: S.loupeMarginRight,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            flex: 1,
            fontFamily: bodyFontFamily,
            fontSize: S.bodySize,
            color: "#45494A",
            lineHeight: S.bodyLine,
            fontWeight: bodyFontFamily ? undefined : "500",
          }}
        >
          {isLoading ? "Analyzing…" : conclusion}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
});