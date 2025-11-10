// src/screens/ScanHistory.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View, Text, StyleSheet, Pressable, StatusBar,
    FlatList,
    Platform,
    Animated
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import { router } from "expo-router";
import { triggerHaptic } from "../../hooks/haptics";
import { apiFetch } from "../../src/api/http";
import { useFocusEffect } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Portal } from "@gorhom/portal";
import { SkeletonBox, SkeletonCircle, SkeletonLine } from "app/components/skeletons";

import { thumbPrefetcher } from "@/services/thumbPrefetcher";
import Thumb from "app/components/Thumb";
import { getStableUri, bumpUri } from "@/services/stableThumbUri";
import { takeBootRows, getBootMeta } from "@/hooks/useWarmWatchesOnBoot";
import { loadHistorySnapshot, saveHistorySnapshot } from "@/services/historySnapshot";
import { Image as XImage } from "expo-image";

type Money = { amount?: number | null; currency?: string | null };
type WatchScore = { letter?: string; numeric?: number | null };
type WatchRow = {
    id: number;
    photoId?: number;
    thumb?: string | null;
    // optional AI bits; show placeholders if missing
    name?: string | null;
    year?: number | null;
    score?: WatchScore | null;
    price?: Money | null;
    status?: string;
};

const skeletonColor = "rgba(0,0,0,0.08)";


export default function ScanHistory() {
    const insets = useSafeAreaInsets();
    const { scale, vw, vh } = useR();        // call once
    const s = scale;
    const EXTRA_TOP = s(70);
    const ABOVE_FOLD = 6;

    const bootRows = React.useRef<WatchRow[]>(
        (takeBootRows() as WatchRow[] | null) ??
        (loadHistorySnapshot() as WatchRow[] | null) ??
        []
    ).current;


    const meta = getBootMeta(); // { stage: "snapshot"|"network"|"none", netCount: number|null }
    const seedBoot = (takeBootRows() as WatchRow[] | null); // may be [] (authoritative empty), array, or null
    const authoritativeEmpty = meta.stage === "network" && meta.netCount === 0;
    // If network said empty, lock to [] on first paint. Else fall back to whatever boot gave us (or snapshot if you still want).
    const initialRows: WatchRow[] = authoritativeEmpty ? [] : (seedBoot ?? (loadHistorySnapshot() as WatchRow[] | null) ?? []);

    const [active, setActive] = useState<"camera" | "collection">("collection");

   // const [rows, setRows] = useState<WatchRow[] | null>(bootRows);
  //  const [loading, setLoading] = useState(bootRows.length === 0);
  //  const rowsRef = React.useRef<WatchRow[] | null>(bootRows);
  //  useEffect(() => { rowsRef.current = rows; }, [rows]);

    const [rows, setRows] = useState<WatchRow[] | null>(initialRows);
    // If we’re showing forced empty from prior network, there’s nothing to “load” visually.
    const [loading, setLoading] = useState(!authoritativeEmpty && initialRows.length === 0);
    const rowsRef = React.useRef<WatchRow[] | null>(initialRows);

    const isFetchingRef = React.useRef(false);

    useEffect(() => {
        const warmSeed = initialRows;
        if (!warmSeed.length) return;
        // Seed canonical map & warm ABOVE_FOLD immediately
        const pairs = warmSeed.slice(0, ABOVE_FOLD)
            .map((it) => it.photoId && it.thumb ? { uri: it.thumb, key: `photo-${it.photoId}` } : null)
            .filter(Boolean) as { uri: string; key: string }[];
        for (const it of warmSeed) {
            if (it.photoId && it.thumb) bumpUri(it.photoId, it.thumb);
        }
        thumbPrefetcher.enqueue(pairs);
        // no setLoading here; we’re already painting rows
    }, []); // run once

    function sameRow(a: WatchRow, b: WatchRow) {
        return (
            a.photoId === b.photoId &&
            a.thumb === b.thumb &&
            a.name === b.name &&
            a.year === b.year &&
            (a.score?.letter ?? "") === (b.score?.letter ?? "") &&
            (a.score?.numeric ?? null) === (b.score?.numeric ?? null) &&
            (a.price?.amount ?? null) === (b.price?.amount ?? null) &&
            (a.price?.currency ?? "") === (b.price?.currency ?? "") &&
            (a.status ?? "") === (b.status ?? "")
        );
    }

    function mergeRows(prev: WatchRow[] | null, fetched: WatchRow[]): WatchRow[] {
        const byId = new Map(fetched.map(r => [r.id, r]));
        const out: WatchRow[] = [];
        const seen = new Set<number>();

        for (const p of (prev ?? [])) {
            const f = byId.get(p.id);
            if (f) {
                out.push(sameRow(p, f) ? p : { ...p, ...f });
                seen.add(p.id);
            } else {
                out.push(p);
            }
        }

        const newOnes = fetched.filter(r => !seen.has(r.id)).sort((a, b) => b.id - a.id);
        return newOnes.length ? [...newOnes, ...out] : out;
    }

    const load = useCallback(async () => {
        if (isFetchingRef.current) return;          // prevent overlap + focus spam
        isFetchingRef.current = true;

        // Show skeleton only if we truly had nothing before this fetch
        if (!authoritativeEmpty)
            setLoading(prev => prev || !(rowsRef.current && rowsRef.current.length));

        try {
            const listRes = await apiFetch(`/watches`);
            const list = (await listRes.json()) as {
                items: Array<{
                    id: number;
                    status?: string;
                    photos?: { id: number; url?: string | null }[];
                    name?: string | null;
                    year?: number | null;
                    overallLetter?: string | null;
                    overallNumeric?: number | null;
                    price?: { amount?: number | null; currency?: string | null } | null;
                }>;
                nextCursor?: number | null;
            };

            const mapped: WatchRow[] = (list.items ?? []).map((it) => {
                const p = it.photos?.[0];
                return {
                    id: it.id,
                    photoId: p?.id,
                    thumb: p?.url ?? null,
                    name: it.name ?? null,
                    year: it.year ?? null,
                    score: it.overallLetter || it.overallNumeric != null
                        ? { letter: it.overallLetter ?? undefined, numeric: it.overallNumeric ?? null }
                        : null,
                    price: it.price ?? null,
                    status: it.status,
                };
            });

            setRows(prev => {
                const merged = mergeRows(prev, mapped);
                // persist for next mount
                saveHistorySnapshot(merged);
                return merged;
            });

            // seed and prefetch above the fold (non-blocking)
            for (const it of list.items ?? []) {
                const p = it?.photos?.[0];
                if (p?.id && p?.url) bumpUri(p.id, p.url);
            }
            const pairs = (list.items ?? [])
                .map((it) => {
                    const p = it?.photos?.[0] as { id?: number; url?: string } | undefined;
                    return p?.id && p?.url ? { uri: p.url, key: `photo-${p.id}` } : null;
                })
                .filter(Boolean) as { uri: string; key: string }[];
            thumbPrefetcher.enqueue(pairs.slice(0, ABOVE_FOLD));
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    }, []); // <-- no rows here

    useFocusEffect(React.useCallback(() => {
        load();
        return () => { };
    }, [load]));

    // ---------- small formatters ----------
    function fmtPriceCompact(m?: Money | null) {
        if (!m || m.amount == null || !m.currency) return "—";
        const n = Number(m.amount);
        if (!isFinite(n)) return "—";
        const abs = Math.abs(n);

        if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(abs < 10_000_000_000 ? 1 : 0)} B ${m.currency}`;
        if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs < 10_000_000 ? 1 : 0)} M ${m.currency}`;
        if (abs >= 10_000) return `${Math.round(n / 1_000)} k ${m.currency}`;
        return `${Math.round(n).toLocaleString()} ${m.currency}`;
    }

    const fmtScore = (s?: WatchScore | null) =>
        s?.letter ? `${s.letter}${s.numeric != null ? ` ${s.numeric}` : ""}` : "—";


    // ---------- card ----------
    const Card = React.memo(
        ({ item }: { item: WatchRow }) => (
            <Pressable
                onPress={() => {
                    triggerHaptic("impactLight");
                    router.push({ pathname: "/feed/watch-details", params: { id: String(item.id) } });
                }}
                style={[styles.card, { padding: s(14), borderRadius: s(28) }]}
            >
                <Thumb photoId={item.photoId} uri={item.thumb} size={s(82)} />
                {/* debug={__DEV__} check this latter */}

                <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={{ fontSize: s(18), fontFamily: Font.inter.extraBold, color: "#0F172A" }}>
                        {item.name ?? "Analyzing…"}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: s(6), gap: s(8) }}>
                        <Pill text={fmtScore(item.score)} tone={item.score?.letter} />
                        <Pill text={fmtPriceCompact(item.price)} />
                        <Pill text={item.year ? String(item.year) : "—"} />
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={s(18)} color="#909090ff" />
            </Pressable>
        ),
        (prev, next) => prev.item === next.item
    );


    const EmptyState = () => (
        <>
            {/* Illustration area (your old design) */}
            <View style={[styles.illustration, { height: vh(52) }]} pointerEvents="none">
                <XImage
                    source={require("../../assets/images/lefthand.webp")}
                    style={[styles.leftHand, { width: vw(45), height: vw(45), bottom: vh(13), left: -vw(0) }]}
                />
                <XImage
                    source={require("../../assets/images/righthand.webp")}
                    contentFit="contain"
                    style={[styles.rightHand, { width: vw(90), height: vw(90), bottom: vh(0), right: -vw(22) }]}
                />
            </View>
            <Text style={[styles.ooops, { fontSize: s(16), marginTop: vh(0) }]}>
                {"Ooops…\nThere are no scanned watches"}
            </Text>
        </>
    );

    const HistoryList = ({ data }: { data: WatchRow[] }) => (
        <FlatList
            data={data}
            keyExtractor={(it) => String(it.id)}
            initialNumToRender={ABOVE_FOLD}
            maxToRenderPerBatch={ABOVE_FOLD}
            windowSize={3}
            contentContainerStyle={{ paddingHorizontal: vw(5), paddingBottom: insets.bottom + s(84), paddingTop: s(16), gap: s(12) }}
            renderItem={({ item }) => <Card item={item} />}
            showsVerticalScrollIndicator={false}
            overScrollMode="always"
            nestedScrollEnabled
            removeClippedSubviews={false}
        />
    );

    // ---------- UI ----------
    //const showEmpty = !loading && (!rows || rows.length === 0);
    const showEmpty = (authoritativeEmpty && true) || (!loading && (!rows || rows.length === 0));
    const ICON_SIZE = scale(28);


    const SkeletonCard = () => (
        <View style={[styles.card, { padding: s(14), borderRadius: s(28) }]}>
            {/* thumb */}
            <SkeletonBox width={s(82)} height={s(82)} borderRadius={s(82) * 0.22} color={skeletonColor} />

            {/* text + pills */}
            <View style={{ flex: 1 }}>
                {/* title two lines */}
                <SkeletonLine width={vw(60)} height={s(18)} radius={6} color={skeletonColor} />
                <SkeletonLine width={vw(42)} height={s(16)} radius={6} color={skeletonColor} style={{ marginTop: s(8) }} />

                {/* three chips */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: s(10), gap: s(8) }}>
                    <SkeletonBox width={s(58)} height={s(26)} borderRadius={999} color={skeletonColor} />
                    <SkeletonBox width={s(62)} height={s(26)} borderRadius={999} color={skeletonColor} />
                    <SkeletonBox width={s(46)} height={s(26)} borderRadius={999} color={skeletonColor} />
                </View>
            </View>

            {/* chevron stub */}
            <SkeletonCircle size={s(18)} />
        </View>
    );

    const SkeletonList = () => (
        <FlatList
            data={Array.from({ length: 8 }, (_, i) => i)}
            keyExtractor={(i) => `sk-${i}`}
            contentContainerStyle={{
                paddingHorizontal: vw(5),
                paddingBottom: insets.bottom + s(84),
                paddingTop: s(16),
                gap: s(12),
            }}
            renderItem={() => <SkeletonCard />}
            showsVerticalScrollIndicator={false}
            overScrollMode="always"
            nestedScrollEnabled
            removeClippedSubviews={false}
        />
    );
    const titleStyle = [
        styles.title,
        Platform.OS === "android"
            ? {
                fontSize: scale(32),
                fontFamily: Font.inter.extraBold,
                // let Android compute a safe line box (no manual lineHeight)
                includeFontPadding: true,
                // OR, if you want to control it:
                // lineHeight: Math.ceil(fs * 1.18),
                // paddingBottom: 2,
            }
            : {
                fontSize: scale(32),
                lineHeight: scale(32),               // iOS is fine
                fontFamily: Font.inter.extraBold,
            },
    ];

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <LinearGradient
                colors={["#FFFFFF", "#F3F1F1", "#F3DCDD", "#E1C7E6"]}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safe} edges={["left", "right"]}>
                {/* 2) Apply safe top once */}
                <View style={{ paddingTop: insets.top }}>
                    {/* 3) Fixed band; header centered vertically inside it */}
                    <View
                        style={{
                            height: EXTRA_TOP,                // e.g., 58 scaled px
                            justifyContent: "center",         // vertical center
                            paddingHorizontal: vw(5),
                        }}
                    >
                        <View style={styles.header}>
                            {/* left spacer to keep title perfectly centered vs right icon */}
                            <View style={{ width: ICON_SIZE, height: ICON_SIZE }} />

                            <Text numberOfLines={1} style={titleStyle}>
                                Scan History
                            </Text>

                            <Pressable
                                onPress={() => {
                                    triggerHaptic("impactMedium");
                                    router.push("/components/support");
                                }}
                                hitSlop={scale(8)}
                                style={{ width: ICON_SIZE, height: ICON_SIZE, alignItems: "center", justifyContent: "center" }}
                            >
                                <XImage
                                    source={require("../../assets/images/info.webp")}
                                    style={{ width: ICON_SIZE, height: ICON_SIZE, tintColor: "#525252" }}
                                    contentFit="contain"
                                />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {authoritativeEmpty ? (
                    <EmptyState />
                ) : loading ? (
                    <SkeletonList />
                ) : showEmpty ? (
                    <EmptyState />
                ) : (
                    <HistoryList data={rows!} />
                )}
            </SafeAreaView>

            <Portal>
                <View style={[styles.navPillWrapper, { bottom: insets.bottom + s(12) }]}
                    pointerEvents="box-none"   >
                    <View style={styles.pillClip} collapsable={false}>
                        <BlurView
                            tint="light"
                            intensity={20}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                            experimentalBlurMethod="dimezisBlurView"
                        />
                        {Platform.OS === "android" && (
                            <View
                                pointerEvents="none"
                                style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]}
                            />
                        )}
                        <View style={styles.navPillContent}>
                            <Pressable
                                onPress={() => { triggerHaptic("impactMedium"); setActive("camera"); router.push("/feed/uploadphotos"); }}
                                style={[styles.navItem, active === "camera" && styles.navItemActive]}
                                hitSlop={8}
                            >
                                <XImage source={require("../../assets/images/camera.webp")} style={{ width: 26, height: 26 }} contentFit="contain" />
                                <Text style={[styles.navItemLabel, active === "camera" && styles.navItemLabelActive]}>Camera</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => { triggerHaptic("impactMedium"); setActive("collection"); }}
                                style={[styles.navItem, { paddingHorizontal: 15 }, active === "collection" && styles.navItemActive]}
                                hitSlop={8}
                            >
                                <XImage source={require("../../assets/images/grid.webp")} style={{ width: 26, height: 26 }} contentFit="contain" />
                                <Text style={[styles.navItemLabel, active === "collection" && styles.navItemLabelActive, { fontFamily: Font.inter.semiBold, fontSize: 11 }]}>
                                    Collection
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Portal>
        </View>
    );
}

// --- tiny pill ---
function Pill({ text, tone }: { text: string; tone?: string }) {
    const bg =
        tone === "A" || tone === "A+" ? "#D1FADF" :
            tone === "B" ? "#E2F2FF" :
                tone === "C" ? "#FFF4CC" :
                    tone === "D" ? "#FFE2E2" : "rgba(0,0,0,0.06)";
    return (
        <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg }}>
            <Text style={{ fontFamily: Font.inter.semiBold, color: "#424B5A" }}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    header: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    supportBtn: { alignItems: "center", justifyContent: "center" },
    title: { color: "#525252", letterSpacing: 0.3, textAlign: "center", flexShrink: 1 },
    illustration: { width: "100%", justifyContent: "flex-end" },
    leftHand: { position: "absolute" },
    rightHand: { position: "absolute" },
    ooops: { color: "#686868", fontFamily: Font.inter.semiBold, textAlign: "center", alignSelf: "center" },
    navPill: {
        position: "absolute", alignSelf: "center", alignItems: "center", flexDirection: "row",
        justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.5)", paddingVertical: 5,
        paddingHorizontal: 5, borderRadius: 100,
    },
    navItem: { flexDirection: "column", alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 26, gap: 0 },
    navItemActive: { backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 100 },
    navItemLabel: { color: "#2B2B2B", textAlign: "center", fontFamily: Font.inter.semiBold, fontSize: 11 },
    navItemLabelActive: { color: "#4456A6" },
    card: {
        width: "100%",
        backgroundColor: "rgba(255,255,255,0.85)",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    navPillWrapper: {
        position: "absolute",
        alignSelf: "center",
        borderRadius: 100,
        backgroundColor: "rgba(255,255,255,0.10)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.35)",
        // shadow
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 0,
    },

    pillClip: {
        borderRadius: 50,
        overflow: "hidden",          // critical: clips BlurView to pill
        // make sure Android respects stacking:
        position: "relative",
    },
    navPillContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        position: "relative",
        zIndex: 0,                   // ensure above BlurView on Android
        elevation: 0,                // belt-and-suspenders for Android
    },
});
