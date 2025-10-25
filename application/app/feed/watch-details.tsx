import React, { useEffect, useMemo, useState } from "react";
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
//import data from "../../hooks/data.json"; // <- your JSON
import { LinearGradient } from "expo-linear-gradient";
import MovementQualityCard, { MovementQualityDTO } from "../../src/components/watch-details/MovementQualityCard";
import ValueMoneyCard, { ValueMoneyDTO } from "../../src/components/watch-details/ValueMoneyCard";
import OverallScoreCard from "../../src/components/watch-details/OvarallCard";
import WatchCard from "../../src/components/watch-details/WatchCard";
import MaterialsAndBuildCard, { MaterialsBuildDTO } from "../../src/components/watch-details/MaterialsAndBuildCard";
import AlternativesCard from "../../src/components/watch-details/AlternativesCard";
import MaintenanceAndRisksCard, { MaintenanceRisksDTO } from "../../src/components/watch-details/MentenanceAndRisksCard";
import { toWatchCardDTO } from "@/dto/toWatchCardDTO";
import { toMovementQualityDTO } from "@/dto/toMovementQualityDTO";
import { toOverallScoreDTO } from "@/dto/toOverallScoreDTO";
import { toMaterialsBuildDTO } from "@/dto/toMaterialsBuildDTO";
import { toMaintenanceRisksDTO } from "@/dto/toMaintenanceRisksDTO";
import { toValueMoneyDTO } from "@/dto/toValueMoneyDTO";
import { toAlternativesDTO } from "@/dto/toAlternativesDTO";
import { ServerWatch } from "@/types/watch";



function decodeJsonParam<T = unknown>(v?: string | string[] | null): T | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(raw)) as T; } catch { return null; }
}


type Packed = { payload: ServerWatch };


export default function WatchDetails() {
  const insets = useSafeAreaInsets();
  const { scale, vw, vh } = useR();
  const { data: packedData } = useLocalSearchParams<{ data?: string }>();
  const packed = useMemo(() => decodeJsonParam<Packed>(packedData), [packedData]);
  const data = packed?.payload ?? null;

  if (!data) return null;
  const dto = useMemo(() => toWatchCardDTO(data), [data]);
  const overall = useMemo(() => toOverallScoreDTO(data), [data]);
  const movementDTO = useMemo(() => toMovementQualityDTO(data), [data]);
  const matDTO = useMemo(() => toMaterialsBuildDTO(data), [data]);
  const maintDTO = useMemo(() => toMaintenanceRisksDTO(data), [data]);
  const valueDTO = useMemo(() => toValueMoneyDTO(data), [data]);
  const altDTO = useMemo(() => toAlternativesDTO(data), [data]);

  /*
  useEffect(() => {
    if (!packedData) { console.log("[WatchDetails] data: <missing>"); return; }
    console.log("[WatchDetails] data (encoded length):", packedData.length);
    if (!packed) { console.log("[WatchDetails] packed: <parse failed>"); return; }
    console.log("[WatchDetails] packed payload id:", packed.payload?.id);

    console.log("[WatchDetails] FULL JSON:\n", JSON.stringify(packed, null, 2));
  }, [packedData, packed]);
*/
  const CARD_MARGIN_H = vw(8);
  const CARD_PADDING = scale(14);
  const CARD_RADIUS = scale(30);
  const CARD_MARGIN_T = scale(15);

  // render
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
          <WatchCard
            {...dto}
            vw={vw}
            scale={scale}
          />

          <OverallScoreCard
            score={overall.score}
            letter={overall.letter}
            conclusion={overall.conclusion}
            vw={vw}
            scale={scale}
          />

          <MovementQualityCard
            {...movementDTO}
            vw={vw}
            scale={scale}
          />

          <MaterialsAndBuildCard
            {...matDTO}
            vw={vw}
            scale={scale}
          />

          <MaintenanceAndRisksCard
            dto={maintDTO}
            vw={vw}
            scale={scale}
          />

          <ValueMoneyCard
            dto={valueDTO}
            vw={vw}
            scale={scale}
          />

          <AlternativesCard
            dto={altDTO}
            vw={vw}
            scale={scale}
          />

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#4b4545ff" },

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
