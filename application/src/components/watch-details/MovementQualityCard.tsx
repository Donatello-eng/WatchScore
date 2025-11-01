// components/MovementQualityCard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  Animated,
  StyleProp,
  Pressable,
} from "react-native";
import GradeRing from "../../../app/components/gradeRing";
import StatTile from "../../../app/components/statTile";
import DotsEllipsis from "@/components/loading/DotsEllipsis";
import InfoOverlay from "app/components/InfoOverlay";
import { StatTileSkeleton } from "../loading/skeletons";

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

  // ring tuning
  ringSize?: number;    // px
  ringStroke?: number;  // px

  // info-popup content
  infoTitle?: string;
  infoText?: string;
};

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
  infoTitle,
  infoText,
}: MovementQualityCardProps) {
  const S = useMemo(
    () => ({
      cardMarginH: cardMarginH ?? vw(5),
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

  const isLoading = loading || (scoreLetter === "-" && !scoreNumeric);

  // center dots sizing proportional to ring
  const dotSize = Math.max(8, Math.min(ringSize * 0.14, 12));
  const dotGap = Math.max(4, dotSize * 0.5);

  // info overlay
  const [showInfo, setShowInfo] = useState(false);
  const defaultInfoTitle = "About Movement Quality";
  const defaultInfoText =
    "What it reflects:\n" +
    "• Movement type, architecture, finishing cues.\n" +
    "• Claimed/observed accuracy bands and reliability signals.\n" +
    "• Service intervals and known weak points.\n\n" +
    "Score is normalized 0–100 and mapped to A/B/C/D.";

  function capStart(s?: string | null) {
    const t = String(s ?? "").trim();
    if (!t) return "–";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

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
        <Pressable hitSlop={8} onPress={() => setShowInfo(true)} style={{ marginLeft: scale(6) }}>
          <Image
            source={require("../../../assets/images/info.webp")}
            style={{ width: S.infoSize, height: S.infoSize, tintColor: "#C7C7C7" }}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {/* Row 1: Type + Grade ring */}
      <View style={{ flexDirection: "row", marginTop: S.rowGapT }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} style={{ alignSelf: "stretch" }} />
          ) : (
            <StatTile
              style={{ alignSelf: "stretch" }}
              value={capStart(movement)}
              icon={require("../../../assets/images/type.webp")}
              label="Type"
            />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: ringSize, height: ringSize, position: "relative" }}>
            <GradeRing
              loading={isLoading}
              baseSize={ringSize}
              baseStroke={ringStroke}
              score={scoreNumeric ?? 0}
              letter={isLoading ? "" : (scoreLetter ?? "-")}
            />

            {isLoading && (
              <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
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
              value={capStart(reliability)}
              icon={require("../../../assets/images/reliability.webp")}
              label="Reliability"
            />
          )}
        </View>
      </View>

      {/* Shared info overlay */}
      <InfoOverlay
        visible={showInfo}
        title={infoTitle ?? defaultInfoTitle}
        message={infoText ?? defaultInfoText}
        onClose={() => setShowInfo(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
  headerRow: { flexDirection: "row", alignItems: "center" },
});
