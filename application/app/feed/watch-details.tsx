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
import { ServerWatch, WatchAI } from "@/types/watch";
import { API_BASE } from "@/config/api";
import { authHeaders } from "@/auth/session";
import { apiFetch } from "@/api/http";


function decodeJsonParam<T = unknown>(v?: string | string[] | null): T | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(raw)) as T; } catch { return null; }
}

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
  const { scale, vw, vh } = useR();

  const insets = useSafeAreaInsets();

  const sseStartedRef = useRef(false);
  const lastRunKeyRef = useRef<string | undefined>(undefined);
  const requestedSectionsRef = useRef<Set<string>>(new Set());

  const [record, setRecord] = useState<ServerWatch | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [ai, setAi] = useState<Partial<WatchAI>>({});

  const { id: idParam, data: packedData } = useLocalSearchParams<{ id?: string; data?: string }>();

  const packed = useMemo(() => decodeJsonParam<{ payload: { record: ServerWatch; ai: Partial<WatchAI> } }>(packedData), [packedData]);

  const ALL_SECTIONS = ["quick_facts", "overall", "movement_quality", "materials_build", "maintenance_risks", "value_for_money", "alternatives"];

  function isFilled(v: any) { return v && typeof v === "object" && Object.keys(v).length > 0; }

  const missingSections = useMemo(() => {
    const ms = ALL_SECTIONS.filter(s => !isFilled((ai as any)[s]));
    if (ms.includes("quick_facts")) return ["quick_facts", ...ms.filter(s => s !== "quick_facts")];
    if (ms.includes("overall")) return ["overall", ...ms.filter(s => s !== "overall")];
    return ms;
  }, [ai]);
  const stopRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (!record?.id) return;
    if (missingSections.length === 0) return;

    const runKey = `${record.id}:${missingSections.join(",")}`;
    if (sseStartedRef.current && lastRunKeyRef.current === runKey) return;

    sseStartedRef.current = true;
    lastRunKeyRef.current = runKey;
    requestedSectionsRef.current = new Set(missingSections);

    let cancelled = false;
    let stop: null | (() => void) = null;

    (async () => {
      const headers = await authHeaders(API_BASE);
      const url =
        `${API_BASE}/watches/${record.id}/analyze-stream` +
        `?wait=1&timeout=45&sections=${encodeURIComponent(missingSections.join(","))}`;

      stop = openAnalysisStreamXHR(url, ({ event, data }) => {
        if (cancelled) return;
        if (event === "section" && data?.section) {
          const sec: string = data.section;
          if (!requestedSectionsRef.current.has(sec)) return;

          const rawPayload = data.data?.[sec] ?? data.data;
          const ok = rawPayload && typeof rawPayload === "object" &&
            (sec !== "overall" || ("conclusion" in rawPayload && "score" in rawPayload));
          if (!ok) return;

          setAi(prev => (isFilled((prev as any)?.[sec]) ? prev : { ...(prev || {}), [sec]: rawPayload }));
        } else if (event === "done") {
          sseStartedRef.current = false;
        }
      }, { headers });

      stopRef.current = stop;
    })();

    return () => {
      cancelled = true;
      try { stop?.(); } catch { }
      sseStartedRef.current = false;
      stopRef.current = null;
    };
  }, [record?.id, missingSections.join(",")]);

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
      setRecord(packed.payload.record);
      setAi(packed.payload.ai ?? {});
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
          const res = await apiFetch(`/watches/${id}`);
          const json = (await res.json()) as ServerWatch;
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

  const dto = useMemo(() => (record ? toWatchCardDTO(record, ai) : null), [record, ai]);
  const overall = useMemo(() => toOverallScoreDTO(ai), [ai]);
  const movementDTO = useMemo(() => toMovementQualityDTO(ai), [ai]);
  const matDTO = useMemo(() => toMaterialsBuildDTO(ai), [ai]);
  const maintDTO = useMemo(() => toMaintenanceRisksDTO(ai), [ai]);
  const valueDTO = useMemo(() => toValueMoneyDTO(ai), [ai]);
  const altDTO = useMemo(() => toAlternativesDTO(ai), [ai]);

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
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#F1F1F1", "#EFC3B0", "#E4ADBE", "#F1F1F1"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* safe area: top/left/right only */}
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + vh(2), // space above home indicator
          }}
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={{ bottom: insets.bottom }}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable hitSlop={12} onPress={() => router.push("/feed/scanhistory")} style={styles.backBtn}>
            <Image source={require("../../assets/images/chevron-left.webp")} style={styles.backIcon} />
          </Pressable>

          {dto && <WatchCard {...dto} vw={vw} scale={scale} />}

          <OverallScoreCard
            loading={!ai.overall}
            score={overall.score}
            letter={overall.letter}
            conclusion={overall.conclusion}
            vw={vw}
            scale={scale}
          />

          <MovementQualityCard {...movementDTO} loading={!movementDTO || (movementDTO.scoreLetter === "-" && !movementDTO.scoreNumeric)} vw={vw} scale={scale} />

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