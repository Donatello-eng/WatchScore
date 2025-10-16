// src/components/GradeRing.tsx
import React from "react";
import { View, Text, TextStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import { pickRingColors } from "../../hooks/ringColors";

export type GradeRingProps = {
  /** 0..100 numeric score */
  score: number;
  /** e.g. "A+" */
  letter: string;
  /** Base logical size before scaling (e.g., 156) */
  baseSize: number;
  /** Base stroke before scaling (e.g., 24) */
  baseStroke: number;
  /** Optional text override */
  labelStyle?: TextStyle;
  /** Optional absolute font size (in dp) for the letter */
  labelFontSize?: number;
};

export default function GradeRing({
  score,
  letter,
  baseSize,
  baseStroke,
  labelStyle,
  labelFontSize,
}: GradeRingProps) {
  const { scale } = useR();

  // Ring geometry (even-ish values after rounding)
  const ringSize = Math.round(scale(baseSize));
  const stroke = Math.round(scale(baseStroke));
  const r = (ringSize - stroke) / 2;
  const c = 2 * Math.PI * r;

  // Progress
  const pct = Math.max(0, Math.min(100, score));
  const dash = Math.min((pct / 100) * c, c - 0.5);
  const dashOffset = 0.001;

  // Colors
  const { progress, track } = pickRingColors(score);

  // Letter size: use prop if provided; otherwise derive from ring size
  const letterSize =
    labelFontSize != null
      ? Math.round(scale(labelFontSize))
      : Math.round(ringSize * 0.33);

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
