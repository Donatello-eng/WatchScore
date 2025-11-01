// src/screens/ScanHistory.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View, Text, StyleSheet, Image, Pressable, StatusBar,
    FlatList, ActivityIndicator,
    Platform
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

// --- minimal types used here ---
type Money = { amount?: number | null; currency?: string | null };
type WatchScore = { letter?: string; numeric?: number | null };
type WatchRow = {
    id: number;
    thumb?: string | null;
    // optional AI bits; show placeholders if missing
    name?: string | null;
    year?: number | null;
    score?: WatchScore | null;
    price?: Money | null;
    status?: string;
};

function Thumb({ uri, size }: { uri?: string | null; size: number }) {
    return uri ? (
        <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size * 0.22 }}
            resizeMode="cover"
        />
    ) : (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.22,
                backgroundColor: "rgba(0,0,0,0.06)",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Ionicons name="watch-outline" size={Math.round(size * 0.44)} color="#9AA1AE" />
        </View>
    );
}


export default function ScanHistory() {
    const insets = useSafeAreaInsets();
    const { scale, vw, vh } = useR();        // call once
    const s = scale;
    const EXTRA_TOP = s(70);

    const [active, setActive] = useState<"camera" | "collection">("collection");
    const [rows, setRows] = useState<WatchRow[] | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // 1) list for ids + thumbs + basic AI fields (now provided by backend)
            const listRes = await apiFetch(`/watches`);
            const list = (await listRes.json()) as {
                items: Array<{
                    id: number;
                    status?: string;
                    photos?: { url?: string | null }[];
                    // new fields from /watches
                    name?: string | null;
                    year?: number | null;
                    overallLetter?: string | null;
                    overallNumeric?: number | null;
                    price?: { amount?: number | null; currency?: string | null } | null;
                }>;
                nextCursor?: number | null;
            };

            const mapped: WatchRow[] = (list.items ?? []).map((it) => ({
                id: it.id,
                thumb: it.photos?.[0]?.url ?? null,
                name: it.name ?? null,
                year: it.year ?? null,
                score:
                    it.overallLetter || it.overallNumeric != null
                        ? { letter: it.overallLetter ?? undefined, numeric: it.overallNumeric ?? null }
                        : null,
                price: it.price ?? null,
                status: it.status,
            }));

            setRows(mapped);
            // if you want pagination later, keep list.nextCursor in state
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            load();                 // runs on first mount and every time screen refocuses
            return () => { };        // no cleanup needed
        }, [load])
    );

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
    const Card = ({ item }: { item: WatchRow }) => (
        <Pressable
            onPress={() => {
                triggerHaptic("impactLight");
                router.push({ pathname: "/feed/watch-details", params: { id: String(item.id) } });
            }}
            style={[styles.card, { padding: s(14), borderRadius: s(28) }]}
        >
            {/* thumb */}
            <Thumb uri={item.thumb} size={s(82)} />

            {/* text + pills */}
            <View style={{ flex: 1 }}>
                <Text
                    numberOfLines={2}
                    style={{ fontSize: s(18), fontFamily: Font.inter.extraBold, color: "#0F172A" }}
                >
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
    );

    const EmptyState = () => (
        <>
            {/* Illustration area (your old design) */}
            <View style={[styles.illustration, { height: vh(52) }]} pointerEvents="none">
                <Image
                    source={require("../../assets/images/lefthand.webp")}
                    style={[styles.leftHand, { width: vw(45), height: vw(45), bottom: vh(13), left: -vw(0) }]}
                />
                <Image
                    source={require("../../assets/images/righthand.webp")}
                    resizeMode="contain"
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
            contentContainerStyle={{ paddingHorizontal: vw(5), paddingBottom: insets.bottom + s(84), paddingTop: s(16), gap: s(12) }}
            renderItem={({ item }) => <Card item={item} />}
            showsVerticalScrollIndicator={false}
            overScrollMode="always"            // <<< bring back Android stretch
            nestedScrollEnabled                // keeps physics correct with overlays
            removeClippedSubviews={false}      // avoids clipping with blurred overlay
        />
    );

    // ---------- UI ----------
    const showEmpty = !loading && (!rows || rows.length === 0);
    const ICON_SIZE = scale(28);

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
                                <Image
                                    source={require("../../assets/images/info.webp")}
                                    style={{ width: ICON_SIZE, height: ICON_SIZE, tintColor: "#525252" }}
                                    resizeMode="contain"
                                />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Body */}
                {loading ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <ActivityIndicator />
                    </View>
                ) : showEmpty ? (
                    <EmptyState />
                ) : (
                    <HistoryList data={rows!} />
                )}
            </SafeAreaView>


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
                            <Image source={require("../../assets/images/camera.webp")} style={{ width: 26, height: 26 }} resizeMode="contain" />
                            <Text style={[styles.navItemLabel, active === "camera" && styles.navItemLabelActive]}>Camera</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => { triggerHaptic("impactMedium"); setActive("collection"); }}
                            style={[styles.navItem, { paddingHorizontal: 15 }, active === "collection" && styles.navItemActive]}
                            hitSlop={8}
                        >
                            <Image source={require("../../assets/images/grid.webp")} style={{ width: 26, height: 26 }} resizeMode="contain" />
                            <Text style={[styles.navItemLabel, active === "collection" && styles.navItemLabelActive, { fontFamily: Font.inter.semiBold, fontSize: 11 }]}>
                                Collection
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
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
        elevation: 8,                             // Android shadow
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
        zIndex: 1,                   // ensure above BlurView on Android
        elevation: 1,                // belt-and-suspenders for Android
    },
});
