// MaterialsAndBuildCard.tsx
import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import StatTile from "../../../app/components/statTile";
import GradeRing from "../../../app/components/gradeRing";

// ---- DTO + props ----
export type MaterialsBuildDTO = {
  // ring score
  scoreNumeric: number;
  scoreLetter: string;

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
  // optional card overrides
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;
};

// ---- Component ----
export default function MaterialsAndBuildCard({
  scoreNumeric,
  scoreLetter,
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
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
}: MaterialsAndBuildCardProps) {
  const S = useMemo(
    () => ({
      rLG: scale(18),
      rMD: scale(12),
      gap: scale(10),
      cardMarginH: cardMarginH ?? vw(8),
      cardPadding: cardPadding ?? scale(14),
      cardRadius: cardRadius ?? scale(30),
      cardMarginT: cardMarginT ?? scale(15),
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
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.cardHeader, { fontSize: scale(18) }]}>
          Materials &amp; Build
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

      {/* Row 1: Weight + Grade ring */}
      <View style={{ flexDirection: "row", marginTop: scale(12) }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
          <StatTile
            style={{ alignSelf: "stretch" }}
            value={`~${totalWeightValue ?? "–"}`}
            unit={`${totalWeightUnit ?? ""}`}
            unitStyle={{ fontSize: 18, color: "#9B9B9B" }}
            icon={require("../../../assets/images/weight.webp")}
            label="Total Weight"
            valueSize={26}
          />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <GradeRing
            score={scoreNumeric ?? 0}
            letter={scoreLetter ?? "-"}
            baseSize={86}
            baseStroke={10}
          />
        </View>
      </View>

      {/* Row 2: Case material + Crystal */}
      <View style={{ flexDirection: "row", marginTop: scale(10) }}>
        <StatTile
          style={{ flex: 1, marginRight: scale(10) }}
          value={`${caseMaterial ?? "–"}`}
          icon={require("../../../assets/images/case-material.webp")}
          label="Case Material"
        />
        <StatTile
          style={{ flex: 1 }}
          value={`${crystalMaterial ?? "–"}`}
          unit={`\n${crystalCoating ?? ""}`}
          unitStyle={{ fontSize: 14, color: "#45494A" }}
          icon={require("../../../assets/images/crystal.webp")}
          label="Crystal"
        />
      </View>

      {/* Row 3: Build quality + Water resistance */}
      <View style={{ flexDirection: "row", marginTop: scale(10) }}>
        <StatTile
          style={{ flex: 1, marginRight: scale(10) }}
          value={`${buildQuality ?? "–"}`}
          icon={require("../../../assets/images/build-quality.webp")}
          label="Build Quality"
        />
        <StatTile
          style={{ flex: 1 }}
          value={`${waterResValue ?? "–"}`}
          unit={`${waterResUnit ?? ""}`}
          unitStyle={{ fontSize: 18, color: "#9B9B9B" }}
          icon={require("../../../assets/images/water-resistance.webp")}
          label="Water Resistance"
          valueSize={26}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
  cardHeaderRow: { flexDirection: "row", alignItems: "center" },
  cardHeader: { color: "#A8A8A8", fontWeight: "600" },
});
