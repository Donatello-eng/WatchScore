// keep a single source of truth for score → colors
export type RingPalette = { progress: string; track: string };

export const RING_STOPS: { min: number; progress: string; track: string }[] = [
  { min: 97, progress: "#4BEC69", track: "#DFF7E9" }, // A+
  { min: 93, progress: "#42d35cff", track: "#E1F7EA" }, // A
  { min: 90, progress: "#31C96F", track: "#E6F8ED" }, // A-
  { min: 87, progress: "#5ED168", track: "#EAF7E6" }, // B+
  { min: 83, progress: "#7BD05E", track: "#EEF7E4" }, // B
  { min: 80, progress: "#A4D650", track: "#F2F8E3" }, // B-
  { min: 77, progress: "#FFC84D", track: "#FFF3D7" }, // C+
  { min: 73, progress: "#FFB84A", track: "#FFF0D0" }, // C
  { min: 70, progress: "#FFA045", track: "#FFE9CA" }, // C-
  { min: 60, progress: "#FF7A59", track: "#FFE1D9" }, // D
  { min: -Infinity, progress: "#F04D4D", track: "#FADCDC" }, // F / fallback
];

export const pickRingColors = (score: number): RingPalette => {
  for (const stop of RING_STOPS) if (score >= stop.min) return stop;
  return RING_STOPS[RING_STOPS.length - 1];
};
