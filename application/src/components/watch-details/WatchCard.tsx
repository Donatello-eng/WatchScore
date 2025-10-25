import React, { useMemo, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type Money = { amount?: number; currency?: string; raw?: string };

export type WatchCardProps = {
  name: string;
  subtitle?: string;
  year?: number | null;
  movement?: string;
  price?: Money;
  photos?: string[];             // signed GET URLs
  vw: (pct: number) => number;
  scale: (n: number) => number;
  onIndexChange?: (i: number) => void;
  titleFontFamily?: string;
  subtitleFontFamily?: string;
  cardMarginH?: number;
  cardPadding?: number;
  cardRadius?: number;
  cardMarginT?: number;
};

export default function WatchCard({
  name,
  subtitle,
  year = null,
  movement = "–",
  price,
  photos = [],
  vw,
  scale,
  onIndexChange,
  titleFontFamily,
  subtitleFontFamily,
  cardMarginH,
  cardPadding,
  cardRadius,
  cardMarginT,
}: WatchCardProps) {
  const S = useMemo(() => ({
    media: vw(50),
    rLG: scale(18),
    rMD: scale(12),
    gapXS: scale(6),
    gapSM: scale(10),
    mlPills: scale(14),
    mtRow: scale(12),
    dot: scale(6),
    pillW: scale(100),
    pillPadV: scale(9),
    icon: scale(25),
    font: scale(13),
    cardMarginH: cardMarginH ?? vw(8),
    cardPadding: cardPadding ?? scale(14),
    cardRadius: cardRadius ?? scale(30),
    cardMarginT: cardMarginT ?? scale(15),
  }), [vw, scale, cardMarginH, cardPadding, cardRadius, cardMarginT]);

  const [photoIndex, setPhotoIndex] = useState(0);
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const idx = Math.round(contentOffset.x / layoutMeasurement.width);
    setPhotoIndex(idx);
    onIndexChange?.(idx);
  };

  return (
    <View style={[
      styles.card,
      {
        marginHorizontal: S.cardMarginH,
        padding: S.cardPadding,
        borderRadius: S.cardRadius,
        marginTop: S.cardMarginT,
      },
    ]}>
      {/* Title */}
      <Text style={{
        fontFamily: titleFontFamily,
        fontSize: scale(24),
        color: "#000",
        fontWeight: titleFontFamily ? undefined : "700",
      }}>
        {name}
      </Text>

      {!!subtitle && (
        <Text style={{
          marginTop: scale(2),
          fontFamily: subtitleFontFamily,
          fontSize: scale(16),
          color: "#A4A4A4",
          fontWeight: subtitleFontFamily ? undefined : "500",
        }}>
          {subtitle}
        </Text>
      )}

      {/* Media + spec pills */}
      <View style={[styles.row, { marginTop: S.mtRow }]}>
        <View style={{ width: S.media, height: S.media }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            style={{ borderRadius: S.rLG }}
            contentContainerStyle={{ borderRadius: S.rLG }}
          >
            {photos.map((uri, i) => (
              <Image
                key={uri + i}
                source={{ uri }}
                style={{ width: S.media, height: S.media, borderRadius: S.rLG }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {!!photos.length && (
            <View style={{
              position: "absolute",
              bottom: S.gapXS,
              alignSelf: "center",
              flexDirection: "row",
              gap: S.gapXS,
              paddingHorizontal: scale(8),
              paddingVertical: scale(2),
              borderRadius: S.rMD,
              backgroundColor: "rgba(0,0,0,0.25)",
            }}>
              {photos.map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={{
                    width: S.dot,
                    height: S.dot,
                    borderRadius: S.dot / 2,
                    backgroundColor: i === photoIndex ? "#FFF" : "rgba(255,255,255,0.5)",
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: S.mlPills, alignItems: "center", gap: S.gapSM }}>
          {year != null && (
            <SpecPill
              width={S.pillW} padV={S.pillPadV} iconSize={S.icon}
              label={String(year)}
              icon={require("../../../assets/images/calendar.webp")}
            />
          )}
          <SpecPill
            width={S.pillW} padV={S.pillPadV} iconSize={S.icon}
            label={movement ?? "–"}
            icon={require("../../../assets/images/gears.webp")}
          />
          <SpecPill
            width={S.pillW} padV={S.pillPadV} iconSize={S.icon}
            label={fmtPrice(price)}
            icon={require("../../../assets/images/money.webp")}
          />
        </View>
      </View>
    </View>
  );
}

function SpecPill({ width, padV, icon, iconSize, label }: { width: number; padV: number; icon: any; iconSize: number; label: string; }) {
  return (
    <View style={[styles.specPill, { width, paddingVertical: padV }]}>
      <Image source={icon} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
      <Text style={[styles.specText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF" },
  row: { flexDirection: "row" },
  specPill: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  specText: { color: "#7B8492", fontWeight: "600", fontSize: 13 },
});

// --- formatting helpers ---
function fmtPrice(p?: Money) {
  const sym = currencyToSymbol(p?.currency);
  if (!p) return `– ${sym}`;
  if (p.raw) {
    const num = String(p.raw).replace(/[^0-9.,]/g, "");
    return `${num} ${sym}`;
  }
  if (p.amount != null) return `${p.amount} ${sym}`;
  return `– ${sym}`;
}
function currencyToSymbol(c?: string) {
  const map: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return c ? map[c] ?? "$" : "$";
}
