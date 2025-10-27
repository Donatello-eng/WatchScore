// src/components/loading/DotsEllipsis.tsx
import React, { useEffect, useMemo } from "react";
import { View, Animated, ViewStyle } from "react-native";

export type DotsEllipsisProps = {
  running?: boolean;       // start/stop animation
  dotCount?: number;       // how many dots (default 3)
  dotSize?: number;        // diameter of each dot
  gap?: number;            // horizontal gap between dots
  color?: string;          // dot color
  baseOpacity?: number;    // min opacity
  peakOpacity?: number;    // max opacity
  duration?: number;       // ms for a full cycle per dot
  style?: ViewStyle;       // container style (center, etc.)
};

export default function DotsEllipsis({
  running = true,
  dotCount = 3,
  dotSize = 12,
  gap = 6,
  color = "#CFCFCF",
  baseOpacity = 0.35,
  peakOpacity = 1,
  duration = 900,
  style,
}: DotsEllipsisProps) {
  // one Animated.Value per dot
  const values = useMemo(
    () => Array.from({ length: dotCount }, () => new Animated.Value(baseOpacity)),
    [dotCount, baseOpacity]
  );

  useEffect(() => {
    if (!running) {
      // reset to base opacity & stop
      values.forEach(v => v.setValue(baseOpacity));
      return;
    }

    // phase shift each dot with initial delay, then keep period with a trailing delay
    // so phase is preserved across loops.
    const perDotDelay = duration / dotCount;
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(Math.round(perDotDelay * i)),
          Animated.timing(v, {
            toValue: peakOpacity,
            duration: Math.round(duration / 2),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: baseOpacity,
            duration: Math.round(duration / 2),
            useNativeDriver: true,
          }),
          Animated.delay(Math.round(perDotDelay * (dotCount - 1))),
        ])
      )
    );

    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [running, values, dotCount, duration, baseOpacity, peakOpacity]);

  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      {values.map((opacity, idx) => (
        <Animated.View
          key={idx}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            marginHorizontal: gap / 2,
            backgroundColor: color,
            opacity,
          }}
        />
      ))}
    </View>
  );
}