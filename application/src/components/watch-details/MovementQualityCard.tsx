// components/MovementQualityCard.tsx
import React from "react";
import { View, Text, Image, StyleSheet, ViewStyle } from "react-native";
import GradeRing from "../../../app/components/gradeRing";
import StatTile from "../../../app/components/statTile";

export type MovementQualityDTO = {
  movement?: string;            // e.g. "quartz", "automatic"
  scoreNumeric?: number;        // 0..100
  scoreLetter?: string;         // "A" | "B" | "C" | "D" | "-"
  accuracy?: string;            // e.g. "±15 sec/day" or "—"
  reliability?: string;         // e.g. "high" | "medium" | "—"
};

export type MovementQualityCardProps = MovementQualityDTO & {
  vw: (pct: number) => number;
  scale: (n: number) => number;
  titleFontFamily?: string;
  style?: ViewStyle;
  cardMarginH?: number;  // defaults to vw(8)
  cardPadding?: number;  // defaults to scale(14)
  cardRadius?: number;   // defaults to scale(30)
  cardMarginT?: number;  // defaults to scale(15)
};

export default function MovementQualityCard({
  movement = "–",
  scoreNumeric = 0,
  scoreLetter = "-",
  accuracy = "–",
  reliability = "–",
  vw,
  scale,
  titleFontFamily,
  style,
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
}: MovementQualityCardProps) {
  const S = {
    cardMarginH: cardMarginH ?? vw(8),
    cardPadding: cardPadding ?? scale(14),
    cardRadius: cardRadius ?? scale(30),
    cardMarginT: cardMarginT ?? scale(15),
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
      <View style={styles.headerRow}>
        <Text
          style={{
            fontFamily: titleFontFamily,
            fontSize: scale(18),
            color: "#A8A8A8",
            fontWeight: titleFontFamily ? undefined : "600",
          }}
        >
          Movement Quality
        </Text>
        <Image
          source={require("../../../assets/images/info.webp")}
          style={{
            width: scale(18),
            height: scale(18),
            tintColor: "#C7C7C7",
            marginLeft: scale(6),
          }}
          resizeMode="contain"
        />
      </View>

      {/* Row 1: Type + Grade ring */}
      <View style={{ flexDirection: "row", marginTop: scale(12) }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
          <StatTile
            style={{ alignSelf: "stretch" }}
            value={movement}
            icon={require("../../../assets/images/type.webp")}
            label="Type"
          />
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GradeRing
            score={scoreNumeric ?? 0}
            letter={scoreLetter ?? "-"}
            baseSize={86}
            baseStroke={10}
          />
        </View>
      </View>

      {/* Row 2: Accuracy + Reliability */}
      <View style={{ flexDirection: "row", marginTop: scale(10) }}>
        <StatTile
          style={{ flex: 1, marginRight: scale(10) }}
          value={accuracy}
          icon={require("../../../assets/images/accuracy.webp")}
          label="Accuracy"
        />
        <StatTile
          style={{ flex: 1 }}
          value={reliability}
          icon={require("../../../assets/images/reliability.webp")}
          label="Reliability"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
  headerRow: { flexDirection: "row", alignItems: "center" },
});
