import React, { useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  Pressable,
  StyleProp,
} from "react-native";
import GradeRing from "../../../app/components/gradeRing";            // updated ring with `loading`
import StatTile from "../../../app/components/statTile";
import DotsEllipsis from "../loading/DotsEllipsis";
import InfoOverlay from "app/components/InfoOverlay";
import { StatTileSkeleton } from "../loading/skeletons";

export type MaintenanceRisksDTO = {
  scoreNumeric: number;
  scoreLetter: string;

  serviceIntervalMin?: number | null;
  serviceIntervalMax?: number | null;

  serviceCostRaw?: string;
  serviceCostAmountMin?: number | null;
  serviceCostAmountMax?: number | null;
  serviceCostCurrency?: string | null;

  partsAvailability?: string;
  serviceability?: string;
  weakPoints?: string[];
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
  infoTitle,
  infoText,
  loading = false,                                        // NEW
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
  containerStyle?: StyleProp<ViewStyle>;
  infoTitle?: string;
  infoText?: string;
  loading?: boolean;                                      // NEW
}) {
  const S = useMemo(
    () => ({
      cardMarginH: cardMarginH ?? vw(5),
      cardPadding: cardPadding ?? scale(14),
      cardRadius: cardRadius ?? scale(30),
      cardMarginT: cardMarginT ?? scale(15),
      headerSize: scale(18),
      gap: scale(10),
      infoSize: scale(18),
    }),
    [vw, scale, cardMarginH, cardPadding, cardRadius, cardMarginT]
  );

  // same detection as other cards: fall back to loading when letter is "-" and no score
  const isLoading = loading || (dto.scoreLetter === "-" && !dto.scoreNumeric);

  // ring + dots sizing
  const RING_SIZE = 86;
  const RING_STROKE = 10;
  const RING_LABEL_FONT_SIZE = 24;
  const dotSize = Math.max(8, Math.min(RING_SIZE * 0.12, 12));
  const dotGap = Math.max(4, dotSize * 0.5);

  const intervalText = formatInterval(dto.serviceIntervalMin, dto.serviceIntervalMax);
  const intervalUnitStyle: TextStyle = {
    fontSize: 18,
    color: unitColor,
    fontFamily: unitFontFamily,
  };

  const serviceCost = fmtServiceCost({
    raw: dto.serviceCostRaw,
    min: dto.serviceCostAmountMin,
    max: dto.serviceCostAmountMax,
    currency: dto.serviceCostCurrency || "USD",
  });

  function capStart(s?: string | null) {
    const t = String(s ?? "").trim();
    if (!t) return "–";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  const partsAvailabilityText = capStart(dto.partsAvailability);
  const serviceabilityText = capStart(dto.serviceability);
  const weakPointsValue =
    Array.isArray(dto.weakPoints) && dto.weakPoints.length
      ? dto.weakPoints
        .map((w) => String(w ?? "").trim())
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("\n")
      : "–";

  const [showInfo, setShowInfo] = useState(false);
  const defaultInfoTitle = "About Maintenance & Risks";
  const defaultInfoText =
    "What it reflects:\n" +
    "• Recommended/observed service intervals.\n" +
    "• Typical service costs and currency context.\n" +
    "• Parts availability and serviceability in practice.\n" +
    "• Known weak points reported by watchmakers/owners.\n\n" +
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
        containerStyle,
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { fontSize: S.headerSize, fontFamily: titleFontFamily }]}>
          Maintenance & Risks
        </Text>
        <Pressable hitSlop={8} onPress={() => setShowInfo(true)} style={{ marginLeft: 6 }}>
          <Image
            source={require("../../../assets/images/info.webp")}
            style={{ width: S.infoSize, height: S.infoSize, tintColor: headerTint }}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {/* Row 1: Service Interval + Ring */}
      <View style={{ flexDirection: "row", marginTop: S.gap + scale(2) }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: S.gap }}>
          {isLoading ? (
            <StatTileSkeleton style={{ alignSelf: "stretch" }} />
          ) : (
            <StatTile
              style={{ alignSelf: "stretch" }}
              value={intervalText}
              unit={"years"}
              unitStyle={intervalUnitStyle}
              icon={require("../../../assets/images/service-interval.webp")}
              label="Service Interval"
              valueSize={26}
            />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: RING_SIZE, height: RING_SIZE, position: "relative" }}>
            <GradeRing
              loading={isLoading}                                  // NEW: internal 0→100→0 loop
              score={dto.scoreNumeric ?? 0}
              letter={isLoading ? "" : (dto.scoreLetter ?? "-")}   // hide letter while loading
              baseSize={RING_SIZE}
              baseStroke={RING_STROKE}
              labelFontSize={RING_LABEL_FONT_SIZE}
            />
            {isLoading && (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}
              >
                <DotsEllipsis running dotSize={dotSize} gap={dotGap} />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Row 2: Service Cost + Parts Availability */}
      <View style={{ flexDirection: "row", marginTop: S.gap }}>
        {isLoading ? (
          <>
            <StatTileSkeleton style={{ flex: 1, marginRight: S.gap }} />
            <StatTileSkeleton style={{ flex: 1 }} />
          </>
        ) : (
          <>
            <StatTile
              style={{ flex: 1, marginRight: S.gap }}
              value={serviceCost}
              icon={require("../../../assets/images/service-cost.webp")}
              label="Service Cost"
            />
            <StatTile
              style={{ flex: 1 }}
              value={partsAvailabilityText}
              icon={require("../../../assets/images/parts-availability.webp")}
              label="Parts Availability"
            />
          </>
        )}
      </View>

      {/* Row 3: Serviceability */}
      <View style={{ marginTop: S.gap }}>
        {isLoading ? (
          <StatTileSkeleton style={{ alignSelf: "stretch" }} />
        ) : (
          <StatTile
            style={{ alignSelf: "stretch" }}
            value={serviceabilityText}
            icon={require("../../../assets/images/serviceability.webp")}
            label="Serviceability"
            valueSize={16}
            valueLines={3}
          />
        )}
      </View>

      {/* Row 4: Known Weak Points */}
      <View style={{ marginTop: S.gap }}>
        {isLoading ? (
          <StatTileSkeleton style={{ alignSelf: "stretch" }} />
        ) : (
          <StatTile
            style={{ alignSelf: "stretch" }}
            value={weakPointsValue}
            valueSize={scale(12)}
            icon={require("../../../assets/images/weak-points.webp")}
            label="Known Weak Points"
            valueLines={0}
          />
        )}
      </View>

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
  headerText: { color: "#A8A8A8", fontWeight: "600" },
});

// helpers
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