// app/feed/analyzing.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Image,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Platform,
    Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ServerWatch, WatchAI } from "@/types/watch";
import { authHeaders } from "@/auth/session";
import { apiFetch } from "@/api/http";
import { API_BASE } from "@/config/api";

const { width: SCREEN_W } = Dimensions.get("window");


type SSEFrame = { event?: string; data?: any };

type Packed = {
    payload: {
        record: ServerWatch;
        ai: Partial<WatchAI>;
    };
};

function openAnalysisStreamXHR(
    url: string,
    onFrame: (f: SSEFrame) => void,
    { headers }: { headers?: Record<string, string> } = {}
) {
    const xhr = new XMLHttpRequest();
    let buffer = "";
    let lastIndex = 0;
    let closed = false;

    console.log("[SSE] opening", url);
    xhr.open("GET", url, true);
    xhr.setRequestHeader("Accept", "text/event-stream");
    if (headers) for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

    xhr.onreadystatechange = () => {
        if (xhr.readyState === xhr.HEADERS_RECEIVED) {
            console.log("[SSE] HEADERS_RECEIVED status:", xhr.status, "ct:", xhr.getResponseHeader("content-type"));
            if (xhr.status >= 400) {
                onFrame({ event: "error", data: { message: `HTTP ${xhr.status}` } });
            }
        }
    };
    xhr.onprogress = () => {
        const text = xhr.responseText || "";
        const chunk = text.slice(lastIndex);
        lastIndex = text.length;
        buffer += chunk;

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
            // Debug each raw frame (shortened)
            console.log("[SSE] frame event:", event, "| data sample:", (dataText ?? "").slice(0, 160));
            if (dataText.length) {
                try {
                    onFrame({ event, data: JSON.parse(dataText) });
                } catch {
                    onFrame({ event, data: dataText });
                }
            }
        }
    };
    xhr.onerror = () => {
        if (!closed) {
            console.warn("[SSE] onerror");
            onFrame({ event: "error", data: { message: "network error" } });
        }
    };
    xhr.onload = () => {
        if (!closed) {
            console.log("[SSE] onload (stream closed by server)");
            onFrame({ event: "done", data: { ok: true } });
        }
    };
    xhr.send();

    return () => {
        closed = true;
        try { xhr.abort(); } catch { }
        console.log("[SSE] aborted");
    };
}

function pack(args: { record: ServerWatch; ai?: Partial<WatchAI> }) {
    const { record, ai = {} } = args;
    const payload: Packed["payload"] = { record, ai };
    return { data: encodeURIComponent(JSON.stringify({ payload })) };
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function Analyzing() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const [record, setRecord] = useState<ServerWatch | null>(null);
    const [loading, setLoading] = useState(true);
    const navigated = useRef(false);
    const stopRef = useRef<null | (() => void)>(null);
    const aiRef = useRef<Partial<WatchAI>>({});
    const [aiTick, setAiTick] = useState(0);

    const gotQuickFacts = !!aiRef.current.quick_facts;

    useEffect(() => {
        const wid = Number(id);
        if (!wid) return;

        let stop: null | (() => void) = null;

        (async () => {
            const headers = await authHeaders(API_BASE); // <-- X-Client-Id + Authorization
            const url = `${API_BASE}/watches/${wid}/analyze-stream?sections=quick_facts,overall&wait=1&timeout=45`;
            stop = openAnalysisStreamXHR(url, ({ event, data }) => {
                if (event === "section" && data?.section) {
                    const sec: string = data.section;
                    const payload = data.data?.[sec] ?? data.data;
                    aiRef.current = { ...aiRef.current, [sec]: payload };
                    setAiTick(t => t + 1);
                }
            }, { headers });
            stopRef.current = stop;
        })();

        return () => { if (stop) stop(); stopRef.current = null; };
    }, [id]);


    useEffect(() => {
        let cancelled = false;
        const wid = Number(id);
        if (!wid) { setLoading(false); return; }

        (async () => {
            try {
                setLoading(true);
                const res = await apiFetch(`/watches/${wid}`);
                const json = (await res.json()) as ServerWatch;
                if (!cancelled) { setRecord(json); setLoading(false); }
            } catch {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        if (!Number(id) || !record || !gotQuickFacts || navigated.current) return;
        navigated.current = true;

        if (stopRef.current) { try { stopRef.current(); } catch { } }
        console.log("[Analyzing] navigating with sections:", Object.keys(aiRef.current || {}));

        router.replace({
            pathname: "/feed/watch-details",
            params: pack({ record: record!, ai: aiRef.current ?? {} }),
        });
    }, [id, record, gotQuickFacts, aiTick]);

    // --- animations
    const bob = useRef(new Animated.Value(0)).current;
    const ring1 = useRef(new Animated.Value(0)).current;
    const ring2 = useRef(new Animated.Value(0)).current;
    const ring3 = useRef(new Animated.Value(0)).current;
    const shine = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // gentle up/down bob
        Animated.loop(
            Animated.sequence([
                Animated.timing(bob, { toValue: 1, duration: 1400, useNativeDriver: true }),
                Animated.timing(bob, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ])
        ).start();

        // concentric ripples
        const mkRipple = (val: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(val, { toValue: 1, duration: 1800, useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }), // reset
                ])
            ).start();

        mkRipple(ring1, 0);
        mkRipple(ring2, 400);
        mkRipple(ring3, 800);

        // quick shine sweep across the image
        Animated.loop(
            Animated.sequence([
                Animated.timing(shine, { toValue: 1, duration: 1600, useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.delay(300),
            ])
        ).start();
    }, []);

    const photoUrl = record?.photos?.[0]?.url;

    // derived anim styles
    const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
    const ringScale = (v: Animated.Value) => v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.6] });
    const ringOpacity = (v: Animated.Value) => v.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] });
    const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_W * 0.6, SCREEN_W * 0.6] });

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <LinearGradient
                colors={["#F1F1F1", "#EFC3B0", "#E4ADBE", "#F1F1F1"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.root}>
                {loading || !photoUrl ? (
                    <ActivityIndicator />
                ) : (
                    <View style={styles.stage}>
                        {/* ripples */}
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.ring,
                                {
                                    transform: [{ scale: ringScale(ring1) }],
                                    opacity: ringOpacity(ring1),
                                },
                            ]}
                        />
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.ring,
                                {
                                    transform: [{ scale: ringScale(ring2) }],
                                    opacity: ringOpacity(ring2),
                                },
                            ]}
                        />
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.ring,
                                {
                                    transform: [{ scale: ringScale(ring3) }],
                                    opacity: ringOpacity(ring3),
                                },
                            ]}
                        />

                        {/* image box */}
                        <Animated.View
                            style={[styles.frame, { transform: [{ translateY }] }]}
                            needsOffscreenAlphaCompositing
                        >
                            <View style={styles.clip}>
                                <Image
                                    source={{ uri: photoUrl }}
                                    resizeMode="contain"
                                    resizeMethod="resize"
                                    style={styles.image}
                                />
                                <AnimatedLinearGradient
                                    colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    pointerEvents="none"
                                    style={[styles.shine, { transform: [{ translateX: shineX }] }]}
                                />
                            </View>
                        </Animated.View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const BOX_W = Math.min(SCREEN_W * 0.78, 360);

const RADIUS = 28;

const styles = StyleSheet.create({
    root: { flex: 1, justifyContent: "center", alignItems: "center" },

    frame: {
        width: BOX_W,
        height: BOX_W * 1.15,
        borderRadius: RADIUS,
        backgroundColor: "transparent",
        // explicitly zero out any shadows/elevation
        elevation: 0,
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
    },
    clip: {
        flex: 1,
        borderRadius: RADIUS,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.35)",
    },

    stage: {
        width: BOX_W * 1.9,
        height: BOX_W * 1.9,
        alignItems: "center",
        justifyContent: "center",
    },

    ring: {
        position: "absolute",
        width: BOX_W * 1.2,
        height: BOX_W * 1.2,
        borderRadius: (BOX_W * 1.2) / 2,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.8)",
    },

    image: {
        width: "100%",
        height: "100%",
    },

    shine: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 90,
        opacity: 0.65,
    },
});