// ValueMoneyCard.tsx
import React, { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View, Pressable } from "react-native";
import GradeRing from "../../../app/components/gradeRing";
import StatTile from "../../../app/components/statTile";
import InfoOverlay from "app/components/InfoOverlay";

/** helpers */
function capStart(s?: string | null) {
  if (s == null) return "–";
  const t = String(s).trim();
  if (!t) return "–";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export type ValueMoneyDTO = {
  // ring
  scoreNumeric: number;
  scoreLetter: string;

  // row 1
  listPriceRaw?: string;
  listPriceAmount?: number | null;
  listPriceCurrency?: string | null;

  // row 2
  resaleRaw?: string;
  resaleAmount?: number | null;
  resaleCurrency?: string | null;
  marketLiquidity?: string;

  // row 3
  holdingLabel?: string;
  holdingNote?: string;

  // row 4
  valueForWearer?: string;
  valueForCollector?: string;

  // row 5
  specEffLabel?: string;
  specEffNote?: string;
};

export default function ValueMoneyCard({
  dto,
  vw,
  scale,
  titleFontFamily,
  pillBodyFontFamily,
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
  headerTint = "#C7C7C7",
  // info overlay
  infoTitle,
  infoText,
}: {
  dto: ValueMoneyDTO;
  vw: (pct: number) => number;
  scale: (n: number) => number;
  titleFontFamily?: string;
  pillBodyFontFamily?: string;
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;
  headerTint?: string;
  infoTitle?: string;
  infoText?: string;
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

  const listPrice = fmtMoney({
    raw: dto.listPriceRaw,
    amount: dto.listPriceAmount ?? undefined,
    currency: dto.listPriceCurrency ?? undefined,
  });

  const resaleAvg = fmtMoney({
    raw: dto.resaleRaw,
    amount: dto.resaleAmount ?? undefined,
    currency: dto.resaleCurrency ?? undefined,
  });

  const holdingUnit =
    dto.holdingNote && dto.holdingNote.trim().length
      ? ` (${dto.holdingNote})`
      : "";

  // info overlay state
  const [showInfo, setShowInfo] = useState(false);
  const defaultInfoTitle = "About Value-for-Money";
  const defaultInfoText =
    "What it reflects:\n" +
    "• List price vs. observed resale averages.\n" +
    "• Market liquidity (how fast it moves at fair price).\n" +
    "• Holding value and who benefits (wearer vs. collector).\n" +
    "• Spec efficiency: specs delivered per unit cost.\n\n" +
    "Ring shows a normalized 0–100 mapped to A/B/C/D.";

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
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.headerText,
            { fontSize: S.headerSize, fontFamily: titleFontFamily },
          ]}
        >
          Value-for-Money
        </Text>
        <Pressable hitSlop={8} onPress={() => setShowInfo(true)} style={{ marginLeft: scale(6) }}>
          <Image
            source={require("../../../assets/images/info.webp")}
            style={{
              width: S.infoSize,
              height: S.infoSize,
              tintColor: headerTint,
            }}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {/* Row 1: List Price + Ring */}
      <View style={{ flexDirection: "row", marginTop: scale(12) }}>
        <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
          <StatTile
            style={{ alignSelf: "stretch" }}
            value={listPrice}
            icon={require("../../../assets/images/money.webp")}
            label="List Price"
            valueSize={26}
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
            score={dto.scoreNumeric ?? 0}
            letter={dto.scoreLetter ?? "-"}
            baseSize={86}
            baseStroke={10}
          />
        </View>
      </View>

      {/* Row 2: Resale Average + Market Liquidity */}
      <View style={{ flexDirection: "row", marginTop: S.gap }}>
        <StatTile
          style={{ flex: 1, marginRight: scale(10) }}
          value={resaleAvg}
          icon={require("../../../assets/images/resale-average.webp")}
          label="Resale Average"
          valueSize={26}
        />
        <StatTile
          style={{ flex: 1 }}
          value={capStart(dto.marketLiquidity)}
          icon={require("../../../assets/images/market-liquidity.webp")}
          label="Market Liquidity"
        />
      </View>

      {/* Row 3: Holding Value */}
      <View style={{ marginTop: S.gap }}>
        <StatTile
          style={{ alignSelf: "stretch" }}
          value={capStart(dto.holdingLabel)}
          unit={holdingUnit}
          unitStyle={{
            fontSize: 13,
            color: "#45494A",
            fontFamily: pillBodyFontFamily,
          }}
          icon={require("../../../assets/images/service-cost.webp")}
          label="Holding Value"
        />
      </View>

      {/* Row 4: pill with divider (wearer | collector) */}
      <View
        style={{
          marginTop: S.gap,
          backgroundColor: "#F5F5F5",
          borderRadius: scale(16),
          paddingVertical: scale(12),
          paddingHorizontal: scale(14),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* LEFT (wearer) */}
          <View style={{ flex: 1, minWidth: 0, paddingRight: scale(12) }}>
            <StatTile
              value={capStart(dto.valueForWearer)}
              icon={require("../../../assets/images/value-for-wearer.webp")}
              label="Value for wearer"
              style={{
                backgroundColor: "transparent",
                paddingVertical: 0,
                paddingHorizontal: 0,
                borderRadius: 0,
                minHeight: 0,
                alignSelf: "stretch",
              }}
            />
          </View>

          {/* DIVIDER */}
          <View
            style={{
              width: 1,
              alignSelf: "stretch",
              backgroundColor: "#afafafff",
            }}
          />

          {/* RIGHT (collector) */}
          <View style={{ flex: 1, minWidth: 0, paddingLeft: scale(12) }}>
            <StatTile
              value={capStart(dto.valueForCollector)}
              icon={require("../../../assets/images/value-for-collector.webp")}
              label="Value for collector"
              style={{
                backgroundColor: "transparent",
                paddingVertical: 0,
                paddingHorizontal: 0,
                borderRadius: 0,
                minHeight: 0,
                alignSelf: "stretch",
              }}
            />
          </View>
        </View>
      </View>

      {/* Row 5: Spec Efficiency */}
      <View style={{ marginTop: S.gap }}>
        <StatTile
          style={{ alignSelf: "stretch" }}
          value={capStart(dto.specEffLabel)}
          valueSize={scale(18)}
          unit={dto.specEffNote ? `\n${dto.specEffNote}` : ""}
          unitStyle={{
            color: "#45494A",
            fontSize: scale(14),
            lineHeight: scale(18),
            fontFamily: pillBodyFontFamily,
          }}
          icon={require("../../../assets/images/spec-efficiency.webp")}
          label="Spec Efficiency"
          valueLines={0}
        />
      </View>

      {/* Info overlay */}
      <InfoOverlay
        visible={showInfo}
        title={infoTitle ?? defaultInfoTitle}
        message={infoText ?? defaultInfoText}
        onClose={() => setShowInfo(false)}
      />
    </View>
  );
}

/** money helpers (unchanged) */
function fmtMoney(input: { raw?: string; amount?: number; currency?: string }) {
  if (input.raw && String(input.raw).trim()) return String(input.raw).trim();
  if (typeof input.amount === "number") {
    return `${input.amount} ${currencyToSymbol(input.currency)}`;
  }
  return `– ${currencyToSymbol(input.currency)}`;
}
function currencyToSymbol(c?: string) {
  const map: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return c ? map[c] ?? "$" : "$";
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerText: { color: "#A8A8A8", fontWeight: "600" },
});