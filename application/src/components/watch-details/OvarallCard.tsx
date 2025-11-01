import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  ImageSourcePropType,
  Animated,
  Pressable,
} from "react-native";
import GradeRing from "../../../app/components/gradeRing";
import InfoOverlay from "app/components/InfoOverlay";
import DotsEllipsis from "../loading/DotsEllipsis";

type OverallScoreCardProps = {
  score: number;
  letter: string;
  conclusion?: string;
  vw: (pct: number) => number;
  scale: (n: number) => number;
  loading?: boolean;
  titleFontFamily?: string;
  bodyFontFamily?: string;
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;
  infoIcon?: ImageSourcePropType;
  loupeIcon?: ImageSourcePropType;

  // optional overrides for the info popup
  infoTitle?: string;
  infoText?: string;
};

const RING_SIZE = 156;
const RING_STROKE = 20;
const RING_LABEL_FONT_SIZE = 35;

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
  infoTitle,
  infoText,
}: OverallScoreCardProps) {
  const S = useMemo(
    () => ({
      cardMarginH: cardMarginH ?? vw(5),
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
      popupTitle: scale(18),
      popupBody: scale(14),
      popupPad: scale(16),
      popupRadius: scale(18),
      closePadH: scale(14),
      closePadV: scale(10),
      closeRadius: scale(12),
    }),
    [vw, scale, cardMarginH, cardPadding, cardRadius, cardMarginT]
  );

  const isLoading = loading || (letter === "-" && !score);

  // size the dots nicely for the center
  const dotSize = useMemo(() => {
    const byLabel = RING_LABEL_FONT_SIZE * 0.42;
    const byRing = RING_SIZE * 0.12;
    return Math.max(8, Math.min(byLabel, byRing));
  }, []);
  const dotGap = Math.max(4, dotSize * 0.5);

  // Info overlay state
  const [showInfo, setShowInfo] = useState(false);
  const defaultInfoTitle = "About Overall Score";
  const defaultInfoText =
    "The ring shows a normalized score from 0–100 mapped to A/B/C/D.\n\n" +
    "How it’s computed:\n" +
    "• Signals from the analysis (movement, materials, service risk, accuracy, QC, value).\n" +
    "• Weighted, normalized, and clamped to 0–100.\n" +
    "• The letter always matches the numeric bin.\n\n" +
    "Scores can update when specs or photos improve.";

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

        <Pressable hitSlop={8} onPress={() => setShowInfo(true)} style={{ marginLeft: scale(6) }}>
          <Image
            source={infoIcon}
            style={{ width: S.infoSize, height: S.infoSize, tintColor: "#c5c5c5ff" }}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {/* Ring + center dots while loading */}
      <View style={{ alignItems: "center", marginTop: S.ringTop }}>
        <View style={{ width: RING_SIZE, height: RING_SIZE, position: "relative" }}>
          <GradeRing
            loading={isLoading}
            score={score}
            letter={isLoading ? "" : (letter ?? "")}  // hide "-" while loading
            baseSize={RING_SIZE}
            baseStroke={RING_STROKE}
            labelFontSize={RING_LABEL_FONT_SIZE}
          />

          {isLoading && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
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
          style={{ width: S.loupeSize, height: S.loupeSize, marginTop: S.loupeMarginTop, marginRight: S.loupeMarginRight }}
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

      {/* Shared Info overlay */}
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
});
