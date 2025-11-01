// app/components/gradeRing.tsx  (match your import path)
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import { pickRingColors } from "../../hooks/ringColors";

export type GradeRingProps = {
  /** 0..100 numeric score when not loading */
  score?: number;
  /** e.g. "A+" (you can pass "" while loading from parent) */
  letter?: string;
  /** Base logical size before scaling (e.g., 156) */
  baseSize: number;
  /** Base stroke before scaling (e.g., 24) */
  baseStroke: number;
  /** Optional text override */
  labelStyle?: TextStyle;
  /** Optional absolute font size (in dp) for the letter */
  labelFontSize?: number;

  /** When true, the ring animates 0→100→0 internally */
  loading?: boolean;
  /** Full cycle length for the loading animation (ms). Default 15000 */
  loadingCycleMs?: number;
  /** Target FPS for the loading loop. Default 30 */
  targetFps?: number;

  /** If provided, overrides score completely (useful for external driving) */
  animatedScore?: number;
};

export default function GradeRing({
  score = 0,
  letter = "",
  baseSize,
  baseStroke,
  labelStyle,
  labelFontSize,
  loading = false,
  loadingCycleMs = 15000,
  targetFps = 30,
  animatedScore,
}: GradeRingProps) {
  const { scale } = useR();

  // Internal triangle-loop for loading
  const [loopScore, setLoopScore] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Prefer external animatedScore if provided; only run loop if loading AND no external driver
    if (!loading || animatedScore != null) {
      setLoopScore(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const t0 = performance.now();
    const minDt = 1000 / Math.max(1, targetFps);
    let lastPush = 0;

    const tick = (t: number) => {
      const elapsed = (t - t0) % loadingCycleMs;
      const phase = (elapsed / loadingCycleMs) * 2; // 0..2
      const y01 = phase < 1 ? phase : 2 - phase;    // 0→1→0
      if (t - lastPush >= minDt) {
        setLoopScore(y01 * 100);
        lastPush = t;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [loading, loadingCycleMs, targetFps, animatedScore]);

  // Choose the score to render
  const effectiveScore =
    animatedScore != null ? animatedScore : loading ? loopScore : score;

  // Geometry
  const ringSize = Math.round(scale(baseSize));
  const stroke = Math.round(scale(baseStroke));
  const r = (ringSize - stroke) / 2;
  const c = 2 * Math.PI * r;

  // Progress
  const pct = Math.max(0, Math.min(100, effectiveScore));
  const dash = Math.min((pct / 100) * c, c - 0.5);
  const dashOffset = 0.001;

  // Colors from score
  const { progress, track } = pickRingColors(effectiveScore);

  // Letter size
  const letterSize =
    labelFontSize != null ? Math.round(scale(labelFontSize)) : Math.round(ringSize * 0.33);

  return (
    <View
      style={{
        width: ringSize,
        height: ringSize,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={ringSize} height={ringSize}>
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={r}
          stroke={progress}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
        />
      </Svg>

      <Text
        style={[
          {
            position: "absolute",
            fontFamily: Font.inter.semiBold,
            fontSize: letterSize,
            color: "#414141",
            textAlign: "center",
          },
          labelStyle,
        ]}
      >
        {letter}
      </Text>
    </View>
  );
}