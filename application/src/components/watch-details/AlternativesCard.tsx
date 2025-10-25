// AlternativesCard.tsx
import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export type Money = { amount?: number; currency?: string; raw?: string };

export type AlternativeDTO = {
  model?: string;
  movement?: string;
  price?: Money;
};

export type AlternativesDTO = {
  items: AlternativeDTO[];
};

export default function AlternativesCard({
  dto,
  vw,
  scale,
  titleFontFamily,
  itemTitleFontFamily,
  chipFontFamily,
  priceFontFamily,
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
  headerTint = "#C7C7C7",
}: {
  dto: AlternativesDTO;
  vw: (pct: number) => number;
  scale: (n: number) => number;
  titleFontFamily?: string;
  itemTitleFontFamily?: string;
  chipFontFamily?: string;
  priceFontFamily?: string;
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;
  headerTint?: string;
}) {
  const S = useMemo(
    () => ({
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
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.headerText,
            { fontSize: scale(18), fontFamily: titleFontFamily },
          ]}
        >
          Alternatives
        </Text>
        <Image
          source={require("../../../assets/images/info.webp")}
          style={{
            width: scale(18),
            height: scale(18),
            tintColor: headerTint,
            marginLeft: scale(6),
          }}
          resizeMode="contain"
        />
      </View>

      {(dto.items ?? []).map((alt, i) => (
        <View
          key={`${alt.model ?? "alt"}-${i}`}
          style={{
            marginTop: i === 0 ? scale(12) : scale(14),
            backgroundColor: "#FFFFFF",
            borderRadius: scale(20),
            borderWidth: 2,
            borderColor: "#EEF1F4",
            paddingVertical: scale(14),
            paddingHorizontal: scale(16),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Left round icon bubble */}
            <View
              style={{
                width: scale(56),
                height: scale(56),
                backgroundColor: "#F9F9F9",
                borderRadius: scale(50),
                borderWidth: 2,
                borderColor: "#EFF1F6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={require("../../../assets/images/watch-glyph.webp")}
                style={{
                  width: scale(26),
                  height: scale(26),
                  tintColor: "#4D535D",
                }}
                resizeMode="contain"
              />
            </View>

            {/* Middle: model + chip */}
            <View style={{ flex: 1, minWidth: 0, marginLeft: scale(14) }}>
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: itemTitleFontFamily,
                  fontWeight: itemTitleFontFamily ? undefined : "700",
                  fontSize: scale(16),
                  color: "#4A4D50",
                }}
              >
                {alt.model ?? "—"}
              </Text>

              <View
                style={{
                  alignSelf: "flex-start",
                  marginTop: scale(8),
                  paddingHorizontal: scale(10),
                  paddingVertical: scale(5),
                  borderRadius: scale(10),
                  backgroundColor: "#ECEDEF",
                }}
              >
                <Text
                  style={{
                    fontFamily: chipFontFamily,
                    fontWeight: chipFontFamily ? undefined : "600",
                    fontSize: scale(13),
                    color: "#8E8F93",
                  }}
                  numberOfLines={1}
                >
                  {alt.movement ?? "—"}
                </Text>
              </View>
            </View>

            {/* Right: price */}
            <View style={{ marginLeft: scale(12), justifyContent: "center" }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: priceFontFamily,
                  fontWeight: priceFontFamily ? undefined : "700",
                  fontSize: scale(15),
                  color: "#23DA60",
                }}
              >
                {fmtPrice(alt.price)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** helpers */
function fmtPrice(p?: Money) {
  const sym = currencyToSymbol(p?.currency);
  if (!p) return `– ${sym}`;
  if (p.raw && String(p.raw).trim()) {
    const num = String(p.raw).replace(/[^0-9.,]/g, "");
    return num ? `${num} ${sym}` : `– ${sym}`;
  }
  if (p.amount != null) return `${p.amount} ${sym}`;
  return `– ${sym}`;
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
