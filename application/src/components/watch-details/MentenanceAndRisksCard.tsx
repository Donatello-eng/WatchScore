import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View, ViewStyle, TextStyle } from "react-native";
import GradeRing from "../../../app/components/gradeRing";
import StatTile from "../../../app/components/statTile";

export type MaintenanceRisksDTO = {
  // numbers shown in the ring
  scoreNumeric: number;
  scoreLetter: string;

  // top-left tile
  serviceIntervalMin?: number | null;
  serviceIntervalMax?: number | null;

  // row 2
  serviceCostRaw?: string;                 // e.g. "$80–$120"
  serviceCostAmountMin?: number | null;
  serviceCostAmountMax?: number | null;
  serviceCostCurrency?: string | null;

  partsAvailability?: string;              // e.g. "high"

  // row 3
  serviceability?: string;                 // free text

  // row 4
  weakPoints?: string[];                   // list
};

export function MaintenanceAndRisksCard({
  dto,
  vw,
  scale,
  titleFontFamily,
  unitFontFamily,
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
  headerTint = "#C7C7C7",
  unitColor = "#9B9B9B",
  containerStyle,
}: {
  dto: MaintenanceRisksDTO;
  vw: (pct: number) => number;
  scale: (n: number) => number;
  titleFontFamily?: string;
  unitFontFamily?: string;
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;
  headerTint?: string;
  unitColor?: string;
  containerStyle?: ViewStyle;
}) {
  const S = useMemo(() => ({
    cardMarginH: cardMarginH ?? vw(8),
    cardPadding: cardPadding ?? scale(14),
    cardRadius: cardRadius ?? scale(30),
    cardMarginT: cardMarginT ?? scale(15),
    headerSize: scale(18),
    gap: scale(10),
  }), [vw, scale, cardMarginH, cardPadding, cardRadius, cardMarginT]);

  const intervalText = formatInterval(dto.serviceIntervalMin, dto.serviceIntervalMax);
  const intervalUnitStyle: TextStyle = { fontSize: 18, color: unitColor, fontFamily: unitFontFamily };

  const serviceCost = fmtServiceCost({
    raw: dto.serviceCostRaw,
    min: dto.serviceCostAmountMin,
    max: dto.serviceCostAmountMax,
    currency: dto.serviceCostCurrency || "USD",
  });

  return (
    <View style={[
      styles.card,
      {
        marginHorizontal: S.cardMarginH,
        padding: S.cardPadding,
        borderRadius: S.cardRadius,
        marginTop: S.cardMarginT,
      },
      containerStyle,
    ]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { fontSize: S.headerSize, fontFamily: titleFontFamily }]}>
          Maintenance & Risks
        </Text>
        <Image
          source={require("../../../assets/images/info.webp")}
          style={{ width: scale(18), height: scale(18), tintColor: headerTint, marginLeft: scale(6) }}
          resizeMode="contain"
        />
      </View>

      {/* Row 1: Service Interval + Ring */}
      <View style={{ flexDirection: "row", marginTop: scale(12) }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
          <StatTile
            style={{ alignSelf: "stretch" }}
            value={intervalText}
            unit={"years"}
            unitStyle={intervalUnitStyle}
            icon={require("../../../assets/images/service-interval.webp")}
            label="Service Interval"
            valueSize={26}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" }}>
          <GradeRing
            score={dto.scoreNumeric ?? 0}
            letter={dto.scoreLetter ?? "-"}
            baseSize={86}
            baseStroke={10}
          />
        </View>
      </View>

      {/* Row 2: Service Cost + Parts Availability */}
      <View style={{ flexDirection: "row", marginTop: S.gap }}>
        <StatTile
          style={{ flex: 1, marginRight: scale(10) }}
          value={serviceCost}
          icon={require("../../../assets/images/service-cost.webp")}
          label="Service Cost"
        />
        <StatTile
          style={{ flex: 1 }}
          value={dto.partsAvailability || "–"}
          icon={require("../../../assets/images/parts-availability.webp")}
          label="Parts Availability"
        />
      </View>

      {/* Row 3: Serviceability */}
      <View style={{ marginTop: S.gap }}>
        <StatTile
          style={{ alignSelf: "stretch" }}
          value={dto.serviceability || "–"}
          icon={require("../../../assets/images/serviceability.webp")}
          label="Serviceability"
          valueSize={16}
        />
      </View>

      {/* Row 4: Known Weak Points */}
      <View style={{ marginTop: S.gap }}>
        <StatTile
          style={{ alignSelf: "stretch" }}
          value={Array.isArray(dto.weakPoints) && dto.weakPoints.length ? dto.weakPoints.join("\n") : "–"}
          valueSize={scale(12)}
          icon={require("../../../assets/images/weak-points.webp")}
          label="Known Weak Points"
          valueLines={0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerText: { color: "#A8A8A8", fontWeight: "600" },
});

// --- helpers (keep local to the card) ---
function formatInterval(min?: number | null, max?: number | null) {
  const a = typeof min === "number" ? min : null;
  const b = typeof max === "number" ? max : null;
  if (a == null && b == null) return "–";
  if (a != null && b != null) return `${a}-${b}`;
  return String(a ?? b ?? "–");
}

function fmtServiceCost(input: { raw?: string; min?: number | null; max?: number | null; currency?: string }) {
  if (input.raw && String(input.raw).trim()) return String(input.raw).trim();
  const sym = currencyToSymbol(input.currency);
  const hasMin = typeof input.min === "number";
  const hasMax = typeof input.max === "number";
  if (hasMin && hasMax) return `${input.min}–${input.max} ${sym}`;
  if (hasMin) return `${input.min} ${sym}`;
  if (hasMax) return `${input.max} ${sym}`;
  return `– ${sym}`;
}

function currencyToSymbol(c?: string) {
  const map: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return c ? map[c] ?? "$" : "$";
}

export default MaintenanceAndRisksCard;
