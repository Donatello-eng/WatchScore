import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import data from "../../hooks/data.json"; // <- your JSON
import { LinearGradient } from "expo-linear-gradient";


type Money = {
  amount?: number;
  currency: string;
  raw?: string;
  approx?: boolean;
};
const fmtMoney = (m?: Money) =>
  m?.raw ??
  (typeof m?.amount === "number"
    ? `${m?.amount}${m?.currency === "USD" ? "$" : ` ${m?.currency}`}`
    : "--");

export default function WatchDetails() {
  const insets = useSafeAreaInsets();
  const { scale, vw, vh } = useR();

  const name = data.name;
  const subtitle = data.subtitle;
  const year = (data as any)?.meta?.release_year ?? null; // shown as "2021" pill
  const movement = data.movement_quality?.type ?? "–";
  const price = data.value_for_money?.list_price;
  const overallLetter = data.overall?.score?.letter ?? "–";
  const overallNumeric = data.overall?.score?.numeric ?? 0;
  const overallText = data.overall?.conclusion ?? "";

  // Score ring sizing
  const ringSize = scale(155);
  const stroke = scale(23);
  const r = (ringSize - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, overallNumeric)); // 0..100
  const dash = (pct / 100) * c;

  const CARD_MARGIN_H = vw(8);
  const CARD_PADDING = scale(14);
  const CARD_RADIUS = scale(30);
  const CARD_MARGIN_T = scale(15);

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient
          colors={["#F1F1F1", "#EFC3B0", "#E4ADBE", "#F1F1F1"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Back */}
        <Pressable
          hitSlop={12}
          onPress={() => router.push("/feed/history")}
          style={styles.backBtn}
        >
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={styles.backIcon}
          />
        </Pressable>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + vh(2) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Card */}
          <View
            style={[
              styles.card,
              {
                marginHorizontal: CARD_MARGIN_H,
                padding: CARD_PADDING,
                borderRadius: CARD_RADIUS,
                marginTop: CARD_MARGIN_T,
              },
            ]}
          >
            {/* Title row */}
            <Text
              style={{
                fontFamily: Font.inter.bold,
                fontSize: scale(24),
                color: "#000000",
              }}
            >
              {name}
            </Text>
            <Text
              style={{
                marginTop: scale(2),
                fontFamily: Font.inter.medium,
                fontSize: scale(16),
                color: "#A4A4A4",
              }}
            >
              {subtitle}
            </Text>

            {/* Photo + spec pills */}
            <View style={{ flexDirection: "row", marginTop: scale(12) }}>
              <Image
                source={require("../../assets/images/rolex.webp")}
                style={{
                  width: vw(50),
                  height: vw(50),
                }}
                resizeMode="contain"
              />

              <View
                style={{
                  flex: 1,
                  marginLeft: scale(14),
                  alignItems: "center", // ← center pills horizontally in the free space
                  gap: scale(10),
                }}
              >
                {/* Year */}
                {year !== null && (
                  <View
                    style={[
                      styles.specPill,
                      { width: scale(100), paddingVertical: scale(9) },
                    ]}
                  >
                    <Image
                      source={require("../../assets/images/calendar.webp")}
                      style={{ width: scale(25), height: scale(25) }}
                      resizeMode="contain"
                    />
                    <Text style={[styles.specText, { fontSize: scale(13) }]}>
                      {String(year)}
                    </Text>
                  </View>
                )}
                {/* Movement */}
                <View
                  style={[
                    styles.specPill,
                    { width: scale(100), paddingVertical: scale(9) },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/gears.webp")}
                    style={{ width: scale(25), height: scale(25) }}
                    resizeMode="contain"
                  />
                  <Text style={[styles.specText, { fontSize: scale(13) }]}>
                    {movement}
                  </Text>
                </View>
                {/* Price */}
                <View
                  style={[
                    styles.specPill,
                    { width: scale(100), paddingVertical: scale(9) },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/money.webp")}
                    style={{ width: scale(25), height: scale(25) }}
                    resizeMode="contain"
                  />
                  <Text style={[styles.specText, { fontSize: scale(13) }]}>
                    {data.value_for_money?.list_price?.raw ?? fmtMoney(price)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Overall Score Card */}
          <View
            style={[
              styles.card,
              {
                marginHorizontal: CARD_MARGIN_H,
                padding: CARD_PADDING,
                borderRadius: CARD_RADIUS,
                marginTop: CARD_MARGIN_T,
              },
            ]}
          >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: Font.inter.semiBold,
                  fontSize: scale(18),
                  color: "#A8A8A8",
                }}
              >
                Overall Score
              </Text>
              <Image
                source={require("../../assets/images/info.webp")}
                style={{
                  width: scale(20),
                  height: scale(20),
                  marginLeft: scale(6),
                  tintColor: "#c5c5c5ff",
                }}
                resizeMode="contain"
              />
            </View>

            {/* Ring + letter */}
            <View style={{ alignItems: "center", marginTop: scale(20) }}>
              <View style={{ width: ringSize, height: ringSize }}>
                <Svg width={ringSize} height={ringSize}>
                  {/* track */}
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={r}
                    stroke="#CDFFD6"
                    strokeWidth={stroke}
                    fill="none"
                  />
                  {/* progress */}
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={r}
                    stroke="#16C172"
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                  />
                </Svg>

                {/* centered overlay for the grade letter */}
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: Font.inter.bold,
                      fontSize: scale(32),
                      lineHeight: scale(32), // helps vertical centering
                      color: "#414141",
                      textAlign: "center",
                    }}
                  >
                    {overallLetter}
                  </Text>
                </View>
              </View>
            </View>

            {/* Conclusion bubble */}
            <View
              style={{
                marginTop: scale(20),
                backgroundColor: "#F5F5F5",
                borderRadius: scale(14),
                padding: scale(12),
                flexDirection: "row",
              }}
            >
              <Image
                source={require("../../assets/images/loupe.webp")}
                style={{
                  width: scale(16),
                  height: scale(16),
                  marginTop: scale(2),
                  marginRight: scale(8),
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: Font.inter.medium,
                  fontSize: scale(12),
                  color: "#45494A",
                  lineHeight: scale(18),
                }}
              >
                {overallText}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F2F2" },

  card: {
    backgroundColor: "#FFFFFF",
  },

  specPill: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  specText: {
    color: "#7B8492",
    fontFamily: Font.inter.semiBold,
  },
  backBtn: {
    width: 40,
    height: 40,
    marginTop: 15,
    marginLeft: 20,
  },
  backIcon: {
    width: 40,
    height: 40,
    tintColor: "#3A3A3A",
  },
});
