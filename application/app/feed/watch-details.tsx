// app/feed/watch-details.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";

import WatchCard from "../../src/components/watch-details/WatchCard";
import OverallScoreCard from "../../src/components/watch-details/OvarallCard";
import MovementQualityCard from "../../src/components/watch-details/MovementQualityCard";
import MaterialsAndBuildCard from "../../src/components/watch-details/MaterialsAndBuildCard";
import MaintenanceAndRisksCard from "../../src/components/watch-details/MentenanceAndRisksCard";
import ValueMoneyCard from "../../src/components/watch-details/ValueMoneyCard";
import AlternativesCard from "../../src/components/watch-details/AlternativesCard";

import { toWatchCardDTO } from "@/dto/toWatchCardDTO";
import { toMovementQualityDTO } from "@/dto/toMovementQualityDTO";
import { toOverallScoreDTO } from "@/dto/toOverallScoreDTO";
import { toMaterialsBuildDTO } from "@/dto/toMaterialsBuildDTO";
import { toMaintenanceRisksDTO } from "@/dto/toMaintenanceRisksDTO";
import { toValueMoneyDTO } from "@/dto/toValueMoneyDTO";
import { toAlternativesDTO } from "@/dto/toAlternativesDTO";
import { ServerWatch } from "@/types/watch";

const API_BASE =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://127.0.0.1:8000";

function decodeJsonParam<T = unknown>(v?: string | string[] | null): T | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as T;
  } catch {
    return null;
  }
}

type Packed = { payload: ServerWatch };

type SSEFrame = { event?: string; data?: any };

export function openAnalysisStreamXHR(
  url: string,
  onFrame: (f: SSEFrame) => void,
  { headers }: { headers?: Record<string, string> } = {}
) {
  const xhr = new XMLHttpRequest();
  let buffer = "";
  let lastIndex = 0;
  let closed = false;

  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "text/event-stream");
  if (headers) {
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
  }

  xhr.onreadystatechange = () => {
    // 2xx means connected; 4xx/5xx -> error
    if (xhr.readyState === xhr.HEADERS_RECEIVED) {
      const status = xhr.status;
      if (status >= 400) {
        onFrame({ event: "error", data: { message: `HTTP ${status}` } });
      }
    }
  };

  xhr.onprogress = () => {
    // RN exposes the whole accumulated response in xhr.responseText
    const text = xhr.responseText || "";
    const chunk = text.slice(lastIndex);
    lastIndex = text.length;

    buffer += chunk;

    // Split into SSE frames (double newline)
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const raw of frames) {
      if (!raw.trim()) continue;

      let event: string | undefined;
      let dataText = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataText += line.slice(5).trim();
      }

      if (dataText.length) {
        try {
          const data = JSON.parse(dataText);
          onFrame({ event, data });
        } catch {
          // not JSON? still deliver raw data
          onFrame({ event, data: dataText });
        }
      }
    }
  };

  xhr.onerror = () => {
    if (closed) return;
    onFrame({ event: "error", data: { message: "network error" } });
  };

  xhr.onload = () => {
    if (closed) return;
    // Server likely sent "done" already, but send a final notice just in case
    onFrame({ event: "done", data: { ok: true } });
  };

  xhr.send();

  // stopper for cleanup
  return () => {
    closed = true;
    try { xhr.abort(); } catch { }
  };
}

export default function WatchDetails() {
  const insets = useSafeAreaInsets();
  const { scale, vw, vh } = useR();

  // Accept BOTH `id` and packed `data`
  const { id: idParam, data: packedData } = useLocalSearchParams<{ id?: string; data?: string }>();

  const [record, setRecord] = useState<ServerWatch | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  // Decode packed JSON (safe to call every render)
  const packed = useMemo(() => decodeJsonParam<Packed>(packedData), [packedData]);

  const sseStartedRef = useRef(false);
  const lastIdRef = useRef<number | undefined>(undefined);


  useEffect(() => {
    if (!record?.id) return;
    if (record.ai) return;            // ok to guard, just don't put it in deps
    if (sseStartedRef.current && lastIdRef.current === record.id) return;

    sseStartedRef.current = true;
    lastIdRef.current = record.id;

    let cancelled = false;
    const url = `${API_BASE}/watches/${record.id}/analyze-stream?parallel=0`;

    const stop = openAnalysisStreamXHR(url, ({ event, data }) => {
      if (cancelled) return;
      console.log("[SSE event]", event, data);

      if (event === "section" && data?.section) {
        const sec: string = data.section;
        const payload = data.data?.[sec] ?? data.data;

        setRecord(prev => {
          if (!prev) return prev;
          const nextAI = { ...(prev.ai || {}), [sec]: payload };
          return { ...prev, ai: nextAI };
        });
      } else if (event === "done") {
        console.log("[SSE done]");
        stop();                      // ✅ stop on completion
        sseStartedRef.current = false;
      } else if (event === "error") {
        console.warn("[SSE error]", data);
      }
    });

    return () => {
      cancelled = true;
      stop();
      sseStartedRef.current = false;
    };
  }, [record?.id, API_BASE]);

  function logJson(tag: string, obj: unknown, max = 2000) {
    try {
      const s = JSON.stringify(obj, null, 2);
      console.log(tag, s.length > max ? s.slice(0, max) + " …(truncated)" : s);
    } catch (e) {
      console.log(tag, "<unserializable>", e);
    }
  }

  async function fetchJsonVerbose(url: string) {
    const t0 = Date.now();
    console.log("[net] GET", url);
    let res: Response;
    try {
      res = await fetch(url);
    } catch (e) {
      console.log("[net] fetch error:", e);
      throw e;
    }
    const text = await res.text();
    console.log("[net] status", res.status, res.ok, "| ct:", res.headers.get("content-type"));
    console.log("[net] body(sample):", text.slice(0, 800));
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.log("[net] JSON.parse error:", e);
      throw new Error("Bad JSON from server");
    }
    console.log("[net] done in", Date.now() - t0, "ms");
    return json;
  }

  // Fetch or adopt packed JSON
  useEffect(() => {
    let cancelled = false;

    // If we have packed JSON, use it
    if (packed?.payload) {
      console.log("[WatchDetails] Using packed JSON (encoded len):", packedData?.length);
      logJson("[WatchDetails] FULL PACKED", packed);
      setRecord(packed.payload);
      setLoading(false);
      setErr(null);
      return () => { cancelled = true; };
    }

    // Otherwise, fetch by id
    const id = Number(idParam);
    if (id && API_BASE) {
      (async () => {
        try {
          setLoading(true);
          const url = `${API_BASE}/watches/${id}`;
          const json = (await fetchJsonVerbose(url)) as ServerWatch;
          if (!cancelled) {
            logJson("[WatchDetails] FETCHED RECORD", json);
            setRecord(json);
            setErr(null);
            setLoading(false);
          }
        } catch (e: any) {
          if (!cancelled) {
            console.warn("[WatchDetails] fetch error:", e);
            setErr(e?.message ?? String(e));
            setLoading(false);
          }
        }
      })();
    } else {
      setLoading(false);
      setErr("Missing id and no packed data");
    }

    return () => { cancelled = true; };
  }, [API_BASE, idParam, packed, packedData]);

  // ✅ CALL ALL HOOKS BEFORE ANY EARLY RETURNS
  const dto = useMemo(() => (record ? toWatchCardDTO(record) : null), [record]);
  const overall = useMemo(
    () => (record ? toOverallScoreDTO(record) : { score: 0, letter: "-", conclusion: "—" }),
    [record]
  );
  const movementDTO = useMemo(() => (record ? toMovementQualityDTO(record) : null), [record]);
  const matDTO = useMemo(() => (record ? toMaterialsBuildDTO(record) : null), [record]);
  const maintDTO = useMemo(() => (record ? toMaintenanceRisksDTO(record) : null), [record]);
  const valueDTO = useMemo(() => (record ? toValueMoneyDTO(record) : null), [record]);
  const altDTO = useMemo(() => (record ? toAlternativesDTO(record) : null), [record]);

  // Now it's safe to early return — hook order
  // 

  useEffect(() => { if (record) logJson("[DTO] WatchCardDTO", dto); }, [record, dto]);
  useEffect(() => { if (record) logJson("[DTO] Overall", overall); }, [record, overall]);
  useEffect(() => { if (record && movementDTO) logJson("[DTO] Movement", movementDTO); }, [record, movementDTO]);
  useEffect(() => { if (record && matDTO) logJson("[DTO] Materials", matDTO); }, [record, matDTO]);
  useEffect(() => { if (record && maintDTO) logJson("[DTO] Maintenance", maintDTO); }, [record, maintDTO]);
  useEffect(() => { if (record && valueDTO) logJson("[DTO] ValueForMoney", valueDTO); }, [record, valueDTO]);
  useEffect(() => { if (record && altDTO) logJson("[DTO] Alternatives", altDTO); }, [record, altDTO]);
  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }
  if (err || !record) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#333" }}>
          {err ? `Failed to load: ${err}` : "No data"}
        </Text>
      </View>
    );
  }
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
        <Pressable hitSlop={12} onPress={() => router.push("/feed/history")} style={styles.backBtn}>
          <Image source={require("../../assets/images/chevron-left.webp")} style={styles.backIcon} />
        </Pressable>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + vh(2) }}
          showsVerticalScrollIndicator={false}
        >
          {dto && <WatchCard {...dto} vw={vw} scale={scale} />}

          <OverallScoreCard
            score={overall.score}
            letter={overall.letter}
            conclusion={overall.conclusion}
            vw={vw}
            scale={scale}
          />

          {movementDTO && <MovementQualityCard {...movementDTO} vw={vw} scale={scale} />}

          {matDTO && <MaterialsAndBuildCard {...matDTO} vw={vw} scale={scale} />}

          {maintDTO && <MaintenanceAndRisksCard dto={maintDTO} vw={vw} scale={scale} />}

          {valueDTO && <ValueMoneyCard dto={valueDTO} vw={vw} scale={scale} />}

          {altDTO && <AlternativesCard dto={altDTO} vw={vw} scale={scale} />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#4b4545ff" },
  backBtn: { width: 40, height: 40, marginTop: 15, marginLeft: 20 },
  backIcon: { width: 40, height: 40, tintColor: "#3A3A3A" },
  cardHeaderRow: { flexDirection: "row", alignItems: "center" },
  cardHeader: { color: "#A8A8A8", fontFamily: Font.inter.semiBold },
});