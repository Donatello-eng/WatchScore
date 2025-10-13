import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
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
import { pickRingColors } from "../../hooks/ringColors";
import StatTile from "../components/statTile";
import GradeRing from "../components/gradeRing";
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

  const CARD_MARGIN_H = vw(8);
  const CARD_PADDING = scale(14);
  const CARD_RADIUS = scale(30);
  const CARD_MARGIN_T = scale(15);

  const { progress, track } = pickRingColors(overallNumeric);

  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      const json = await AsyncStorage.getItem(`session:${sessionId}`);
      if (!json) return;
      try {
        const manifest = JSON.parse(json);
        const imgs: string[] = (manifest?.images ?? []).filter(
          (u: string) => !!u
        );
        setPhotos(imgs);
        setPhotoIndex(0);
      } catch {}
    })();
  }, [sessionId]);

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
              {photos.length > 0 ? (
                <View style={{ width: vw(50), height: vw(50) }}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const { contentOffset, layoutMeasurement } =
                        e.nativeEvent;
                      const idx = Math.round(
                        contentOffset.x / layoutMeasurement.width
                      );
                      setPhotoIndex(idx);
                    }}
                    style={{ borderRadius: scale(18) }}
                    contentContainerStyle={{ borderRadius: scale(18) }}
                  >
                    {photos.map((uri, i) => (
                      <Image
                        key={uri + i}
                        source={{ uri }}
                        style={{
                          width: vw(50),
                          height: vw(50),
                          borderRadius: scale(18),
                        }}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>

                  {/* dots */}
                  {photos.length > 1 && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: scale(6),
                        alignSelf: "center",
                        flexDirection: "row",
                        gap: scale(6),
                        paddingHorizontal: scale(8),
                        paddingVertical: scale(2),
                        borderRadius: scale(10),
                        backgroundColor: "rgba(0,0,0,0.25)",
                      }}
                    >
                      {photos.map((_, i) => (
                        <View
                          key={`dot-${i}`}
                          style={{
                            width: scale(6),
                            height: scale(6),
                            borderRadius: scale(3),
                            backgroundColor:
                              i === photoIndex
                                ? "#FFFFFF"
                                : "rgba(255,255,255,0.5)",
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <Image
                  source={require("../../assets/images/rolex.webp")}
                  style={{
                    width: vw(50),
                    height: vw(50),
                    borderRadius: scale(18),
                  }}
                  resizeMode="contain"
                />
              )}

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
              <GradeRing
                score={overallNumeric ?? 0}
                letter={overallLetter ?? "-"}
                baseSize={156}
                baseStroke={23}
                labelFontSize={35}
              />
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

          {/* ───────────────────── Movement Quality ───────────────────── */}
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
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardHeader, { fontSize: scale(18) }]}>
                Movement Quality
              </Text>
              <Image
                source={require("../../assets/images/info.webp")}
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
              {/* Left column: same gap as Row 2 */}
              <View style={{ flex: 1, minWidth: 0, marginRight: scale(10) }}>
                <StatTile
                  style={{ alignSelf: "stretch" }} // fill its half
                  value={movement}
                  icon={require("../../assets/images/type.webp")}
                  label="Type"
                />
              </View>

              {/* Right column: ring centered in its half */}
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GradeRing
                  score={data.movement_quality?.score?.numeric ?? 0}
                  letter={data.movement_quality?.score?.letter ?? "-"}
                  baseSize={86}
                  baseStroke={10}
                />
              </View>
            </View>

            {/* Row 2: Accuracy + Reliability */}
            <View style={{ flexDirection: "row", marginTop: scale(10) }}>
              <StatTile
                style={{ flex: 1, marginRight: scale(10) }}
                value={`${data.movement_quality?.accuracy?.raw ?? "–"}`}
                icon={require("../../assets/images/accuracy.webp")}
                label="Accuracy"
              />
              <StatTile
                style={{ flex: 1 }}
                value={`${data.movement_quality?.reliability?.label ?? "–"}`}
                icon={require("../../assets/images/reliability.webp")}
                label="Reliability"
              />
            </View>
          </View>

          {/* ───────────────────── Materials & Build ───────────────────── */}
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
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardHeader, { fontSize: scale(18) }]}>
                Materials & Build
              </Text>
              <Image
                source={require("../../assets/images/info.webp")}
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
                  value={`~${data.materials_build?.total_weight?.value ?? "–"}`}
                  unit={`${data?.materials_build?.total_weight?.unit ?? ""}`}
                  unitStyle={{ fontSize: 18, color: "#9B9B9B" }}
                  icon={require("../../assets/images/weight.webp")}
                  label="Total Weight"
                  valueSize={26}
                />
              </View>
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GradeRing
                  score={data.materials_build?.score?.numeric ?? 0}
                  letter={data.materials_build?.score?.letter ?? "-"}
                  baseSize={86}
                  baseStroke={10}
                />
              </View>
            </View>

            {/* Row 2: Case material + Crystal */}
            <View style={{ flexDirection: "row", marginTop: scale(10) }}>
              <StatTile
                style={{ flex: 1, marginRight: scale(10) }}
                value={`${data.materials_build?.case_material?.raw ?? "–"}`}
                icon={require("../../assets/images/case-material.webp")}
                label="Case Material"
              />
              <StatTile
                style={{ flex: 1 }}
                value={`${data.materials_build?.crystal?.material ?? "–"}`}
                unit={`\n${data?.materials_build?.crystal?.coating ?? ""}`}
                unitStyle={{ fontSize: 14, color: "#45494A" }}
                icon={require("../../assets/images/crystal.webp")}
                label="Crystal"
              />
            </View>

            {/* Row 3: Build quality + Water resistance */}
            <View style={{ flexDirection: "row", marginTop: scale(10) }}>
              <StatTile
                style={{ flex: 1, marginRight: scale(10) }}
                value={`${data.materials_build?.build_quality?.label ?? "–"}`}
                icon={require("../../assets/images/build-quality.webp")}
                label="Build Quality"
              />
              <StatTile
                style={{ flex: 1 }}
                value={`${
                  data.materials_build?.water_resistance?.value ?? "–"
                }`}
                unit={`${data?.materials_build?.water_resistance?.unit ?? ""}`}
                unitStyle={{ fontSize: 18, color: "#9B9B9B" }}
                icon={require("../../assets/images/water-resistance.webp")}
                label="Water Resistance"
                valueSize={26}
              />
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
  cardHeaderRow: { flexDirection: "row", alignItems: "center" },
  cardHeader: { color: "#A8A8A8", fontFamily: Font.inter.semiBold },
});
