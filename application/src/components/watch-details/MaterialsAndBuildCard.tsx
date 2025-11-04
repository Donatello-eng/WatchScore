// MaterialsAndBuildCard.tsx
import React, { useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  Pressable,
} from "react-native";
import StatTile from "../../../app/components/statTile";
import GradeRing from "../../../app/components/gradeRing";          // supports `loading`
import DotsEllipsis from "@/components/loading/DotsEllipsis";
import InfoOverlay from "app/components/InfoOverlay";
import { StatTileSkeleton } from "../../../app/components/skeletons";

// ---- DTO + props ----
export type MaterialsBuildDTO = {
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

  // card overrides
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;

  // ring overrides
  ringSize?: number;   // default 86
  ringStroke?: number; // default 10

  // info popup
  infoTitle?: string;
  infoText?: string;
};

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
  infoTitle,
  infoText,
}: MaterialsAndBuildCardProps) {
  const S = useMemo(
    () => ({
      cardMarginH: cardMarginH ?? vw(5),
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

  const isLoading = loading || (scoreLetter === "-" && !scoreNumeric);

  // dots sizing for ring center
  const dotSize = Math.max(8, Math.min(ringSize * 0.14, 12));
  const dotGap = Math.max(4, dotSize * 0.5);

  const fmtWeight = () => {
    if (totalWeightValue == null) return "–";
    return `~${totalWeightValue}`;
  };

  function capStart(s?: string | null) {
    const t = String(s ?? "").trim();
    if (!t) return "–";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // info popup state
  const [showInfo, setShowInfo] = useState(false);
  const defaultInfoTitle = "About Materials & Build";
  const defaultInfoText =
    "What it reflects:\n" +
    "• Case material and finishing choices.\n" +
    "• Crystal type and coatings.\n" +
    "• Assembly/build quality cues.\n" +
    "• Water-resistance rating (laboratory vs real-world).\n\n" +
    "Ring score is normalized 0–100, mapped to A/B/C/D.";

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

        <Pressable hitSlop={8} onPress={() => setShowInfo(true)} style={{ marginLeft: 6 }}>
          <Image
            source={require("../../../assets/images/info.webp")}
            style={{ width: S.infoSize, height: S.infoSize, tintColor: "#C7C7C7" }}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {/* Row 1: Weight + Grade ring */}
      <View style={{ flexDirection: "row", marginTop: S.rowGapTop }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: S.rowGap }}>
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
              loading={isLoading}                                   // internal 0→100→0 loop
              score={scoreNumeric ?? 0}
              letter={isLoading ? "" : (scoreLetter ?? "-")}
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
        <View style={{ flex: 1, marginRight: S.rowGap }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} />
          ) : (
            <StatTile
              style={{ flex: 1 }}
              valueLines={4}
              value={capStart(caseMaterial)}
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
              value={capStart(crystalMaterial)}
              unit={crystalCoating ? `\n${capStart(crystalCoating)}` : ""}
              unitStyle={{ fontSize: 14, color: "#45494A" }}
              icon={require("../../../assets/images/crystal.webp")}
              label="Crystal"
            />
          )}
        </View>
      </View>

      {/* Row 3: Build quality + Water resistance */}
      <View style={{ flexDirection: "row", marginTop: S.rowGap }}>
        <View style={{ flex: 1, marginRight: S.rowGap }}>
          {isLoading ? (
            <StatTileSkeleton scale={scale} />
          ) : (
            <StatTile
              style={{ flex: 1 }}
              value={capStart(buildQuality)}
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

      {/* Info Overlay */}
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
  cardHeaderRow: { flexDirection: "row", alignItems: "center" },
  cardHeader: { color: "#A8A8A8" },
});