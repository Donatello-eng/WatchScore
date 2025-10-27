// MaterialsAndBuildCard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View, ViewStyle, Animated, StyleProp } from "react-native";
import StatTile from "../../../app/components/statTile";
import GradeRing from "../../../app/components/gradeRing";
import DotsEllipsis from "@/components/loading/DotsEllipsis";

// ---- DTO + props ----
export type MaterialsBuildDTO = {
  // ring score
  scoreNumeric?: number;          // 0..100
  scoreLetter?: string;           // "A" | "B" | "C" | "D" | "-"

  // row 1
  totalWeightValue?: number | null; // e.g., 45
  totalWeightUnit?: string;         // e.g., "g"

  // row 2
  caseMaterial?: string;            // p.case_material.raw (preferred) or material
  crystalMaterial?: string;         // e.g., "sapphire"
  crystalCoating?: string;          // e.g., "AR coating"

  // row 3
  buildQuality?: string;            // e.g., "good"
  waterResValue?: number | null;    // e.g., 30
  waterResUnit?: string;            // e.g., "m"
};

export type MaterialsAndBuildCardProps = MaterialsBuildDTO & {
  vw: (pct: number) => number;
  scale: (n: number) => number;

  loading?: boolean;
  titleFontFamily?: string;
  style?: StyleProp<ViewStyle>;

  // optional card overrides
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;

  // optional ring overrides
  ringSize?: number;   // default 86
  ringStroke?: number; // default 10
};

// ---- loading ring tuning (aligned with other cards) ----
const LOADING_RING_CYCLE_MS = 8000; // 0→100→0 in 8s
const LOADING_RING_STEPS = 120;     // quantization to limit re-renders

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

// ---- Component ----
export default function MaterialsAndBuildCard({
  scoreNumeric = 0,
  scoreLetter = "-",
  totalWeightValue,
  totalWeightUnit,
  caseMaterial,
  crystalMaterial,
  crystalCoating,
  buildQuality,
  waterResValue,
  waterResUnit,
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
}: MaterialsAndBuildCardProps) {
  const S = useMemo(
    () => ({
      cardMarginH: cardMarginH ?? vw(8),
      cardPadding: cardPadding ?? scale(14),
      cardRadius: cardRadius ?? scale(30),
      cardMarginT: cardMarginT ?? scale(15),
      headerSize: scale(18),
      infoSize: scale(18),
      rowGapTop: scale(12),
      rowGap: scale(10),
    }),
    [vw, scale, cardMarginH, cardPadding, cardRadius, cardMarginT]
  );

  // rAF triangle loop 0→100→0 (keeps last frame when loading ends)
  const [loopScore, setLoopScore] = useState(0);
  useEffect(() => {
    if (!loading) return;
    let raf = 0;
    const t0 = performance.now();
    const lastQ = { v: -1 };
    const tick = () => {
      const elapsed = (performance.now() - t0) % LOADING_RING_CYCLE_MS;
      const phase = (elapsed / LOADING_RING_CYCLE_MS) * 2; // 0..2
      const y01 = phase < 1 ? phase : (2 - phase);         // triangle 0→1→0
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

  // dots sizing for ring center
  const dotSize = Math.max(8, Math.min(ringSize * 0.14, 12));
  const dotGap = Math.max(4, dotSize * 0.5);

  // helpers
  const fmtWeight = () => {
    if (totalWeightValue == null) return "–";
    return `~${totalWeightValue}`;
  };

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
      <View style={styles.cardHeaderRow}>
        <Text
          style={[
            styles.cardHeader,
            { fontSize: S.headerSize, fontFamily: titleFontFamily, fontWeight: titleFontFamily ? undefined : "600" },
          ]}
        >
          Materials &amp; Build
        </Text>
        <Image
          source={require("../../../assets/images/info.webp")}
          style={{ width: S.infoSize, height: S.infoSize, tintColor: "#C7C7C7", marginLeft: scale(6) }}
          resizeMode="contain"
        />
      </View>

      {/* Row 1: Weight + Grade ring */}
      <View style={{ flexDirection: "row", marginTop: S.rowGapTop }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} style={{ alignSelf: "stretch" }} />
          ) : (
            <StatTile
              style={{ alignSelf: "stretch" }}
              value={fmtWeight()}
              unit={`${totalWeightUnit ?? ""}`}
              unitStyle={{ fontSize: 18, color: "#9B9B9B" }}
              icon={require("../../../assets/images/weight.webp")}
              label="Total Weight"
              valueSize={26}
            />
          )}
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: ringSize, height: ringSize, position: "relative" }}>
            <GradeRing
              score={isLoading ? loopScore : (scoreNumeric ?? 0)}
              letter={isLoading ? "" : (scoreLetter ?? "-")} // hide "-" while loading
              baseSize={ringSize}
              baseStroke={ringStroke}
            />

            {isLoading && (
              <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                <DotsEllipsis running dotSize={dotSize} gap={dotGap} color="#CFCFCF" duration={900} />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Row 2: Case material + Crystal */}
      <View style={{ flexDirection: "row", marginTop: S.rowGap }}>
        <View style={{ flex: 1, marginRight: scale(10) }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} />
          ) : (
            <StatTile
              style={{ flex: 1 }}
              value={`${caseMaterial ?? "–"}`}
              icon={require("../../../assets/images/case-material.webp")}
              label="Case Material"
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} />
          ) : (
            <StatTile
              style={{ flex: 1 }}
              value={`${crystalMaterial ?? "–"}`}
              unit={crystalCoating ? `\n${crystalCoating}` : ""}
              unitStyle={{ fontSize: 14, color: "#45494A" }}
              icon={require("../../../assets/images/crystal.webp")}
              label="Crystal"
            />
          )}
        </View>
      </View>

      {/* Row 3: Build quality + Water resistance */}
      <View style={{ flexDirection: "row", marginTop: S.rowGap }}>
        <View style={{ flex: 1, marginRight: scale(10) }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} />
          ) : (
            <StatTile
              style={{ flex: 1 }}
              value={`${buildQuality ?? "–"}`}
              icon={require("../../../assets/images/build-quality.webp")}
              label="Build Quality"
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} />
          ) : (
            <StatTile
              style={{ flex: 1 }}
              value={`${waterResValue ?? "–"}`}
              unit={`${waterResUnit ?? ""}`}
              unitStyle={{ fontSize: 18, color: "#9B9B9B" }}
              icon={require("../../../assets/images/water-resistance.webp")}
              label="Water Resistance"
              valueSize={26}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
  cardHeaderRow: { flexDirection: "row", alignItems: "center" },
  cardHeader: { color: "#A8A8A8" },
});
