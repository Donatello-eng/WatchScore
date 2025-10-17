// src/hooks/useR.ts
import { useWindowDimensions, PixelRatio } from "react-native";

/** Design baseline:(412 dp not pixels). Clamp so sizes stay sane. */
const BASE_WIDTH = 412;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.25;

/**
 * Responsive helpers:
 * - scale(n): scales a number from the BASE_WIDTH, clamped 0.8x–1.25x
 * - vw(%), vh(%): percentages of the current screen width/height
 */
export function useR() {
  const { width, height } = useWindowDimensions();
  const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, width / BASE_WIDTH));

  const scale = (n: number) => PixelRatio.roundToNearestPixel(n * s);
  const vw = (pct: number) => (width * pct) / 100;
  const vh = (pct: number) => (height * pct) / 100;

  return { width, height, scale, vw, vh };
}
