import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View, ImageSourcePropType } from "react-native";
import GradeRing from "../../../app/components/gradeRing"; // ← adjust path if different

export type OverallScoreCardProps = {
  score: number;                 // 0..100
  letter: string;                // "A" | "B" | "C" | "D" | "-"
  conclusion?: string;           // short AI summary
  vw: (pct: number) => number;   // your vw helper
  scale: (n: number) => number;  // your scale helper
  // Optional fonts
  titleFontFamily?: string;
  bodyFontFamily?: string;
  // Optional layout overrides
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;
  // Optional icon overrides
  infoIcon?: ImageSourcePropType;
  loupeIcon?: ImageSourcePropType;
  // Optional ring sizing
  ringSize?: number;        // default 156
  ringStroke?: number;      // default 20
  ringLabelFontSize?: number; // default 35
};

export default function OverallScoreCard({
  score,
  letter,
  conclusion = "—",
  vw,
  scale,
  titleFontFamily,
  bodyFontFamily,
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
  infoIcon = require("../../../assets/images/info.webp"),
  loupeIcon = require("../../../assets/images/loupe.webp"),
  ringSize = 156,
  ringStroke = 20,
  ringLabelFontSize = 35,
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

      {/* Ring + letter */}
      <View style={{ alignItems: "center", marginTop: S.ringTop }}>
        <GradeRing
          score={score ?? 0}
          letter={letter ?? "-"}
          baseSize={ringSize}
          baseStroke={ringStroke}
          labelFontSize={ringLabelFontSize}
        />
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
          {conclusion}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
});
