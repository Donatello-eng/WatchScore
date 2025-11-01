// app/components/skeletons.tsx
import React, { useEffect, useRef } from "react";
import { Animated, View, ViewStyle, StyleProp } from "react-native";

type PulseOpts = { from?: number; to?: number; durationMs?: number };
export function usePulse({ from = 0.5, to = 1, durationMs = 700 }: PulseOpts = {}) {
  const opacity = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: to, duration: durationMs, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: from, duration: durationMs, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [from, to, durationMs, opacity]);
  return opacity;
}

type BoxProps = {
  width?: number | string; // supports numbers or percentages
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
  animated?: boolean;
  accessibilityLabel?: string;
};

/**
 * Renders shape on a plain View (safe for % widths).
 * If animated, wraps it in an Animated.View that only animates opacity.
 */
export function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
  color = "#EDEDED",
  animated = true,
  accessibilityLabel = "loading",
}: BoxProps) {
  const opacity = usePulse();

  const base: ViewStyle = {
    height,
    borderRadius,
    backgroundColor: color,
  };

  // Put width in a separate style chunk; if it's a string, cast to any to satisfy RN’s types.
  const widthStyle: StyleProp<ViewStyle> =
    typeof width === "number"
      ? { width }
      : typeof width === "string"
      ? ({ width } as any)
      : undefined;

  const content = <View style={[base, widthStyle, style]} />;

  if (!animated) return content;

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={{ opacity }}
    >
      {content}
    </Animated.View>
  );
}

export function SkeletonCircle({
  size,
  style,
  color,
  animated,
}: { size: number; style?: StyleProp<ViewStyle>; color?: string; animated?: boolean }) {
  return (
    <SkeletonBox
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
      color={color}
      animated={animated}
      accessibilityLabel="loading"
    />
  );
}

type LineProps = {
  /** numeric width; prefer this when possible */
  width?: number;
  /** percent width, e.g., 70 means "70%"; typed via cast to avoid RN’s Animated type conflicts */
  pct?: number;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
  animated?: boolean;
};

export function SkeletonLine({
  width,
  pct,
  height = 12,
  radius = 6,
  style,
  color = "#EDEDED",
  animated = true,
}: LineProps) {
  // If pct provided, convert to string width but isolate + cast it
  const widthStyle: StyleProp<ViewStyle> =
    pct != null ? ({ width: `${pct}%` } as any) : width != null ? { width } : { alignSelf: "stretch" };

  return (
    <SkeletonBox
      // width left undefined; we pass it via widthStyle to avoid assigning string into ViewStyle directly
      height={height}
      borderRadius={radius}
      style={[widthStyle, style]}
      color={color}
      animated={animated}
    />
  );
}

type StatTileSkeletonProps = {
  scale?: (n: number) => number;
  style?: StyleProp<ViewStyle>;
  lines?: 2 | 1;
  iconSize?: number;
};

export function StatTileSkeleton({
  scale = (n) => n,
  style,
  lines = 2,
  iconSize,
}: StatTileSkeletonProps) {
  const IS = iconSize ?? scale(22);
  return (
    <View
      style={[
        {
          backgroundColor: "#F5F5F5",
          borderRadius: 14,
          padding: scale(12),
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
    >
      <SkeletonCircle size={IS} />
      <View style={{ flex: 1, marginLeft: scale(10) }}>
        <SkeletonLine pct={70} height={scale(14)} radius={6} />
        {lines === 2 && <SkeletonLine pct={40} height={scale(12)} radius={6} style={{ marginTop: 6 }} />}
      </View>
    </View>
  );
}

export default {
  usePulse,
  SkeletonBox,
  SkeletonCircle,
  SkeletonLine,
  StatTileSkeleton,
};