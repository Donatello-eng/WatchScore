// dto/movementQuality.ts
import { WatchAI } from "@/types/watch";

export type MovementQualityDTO = {
  movement: string;
  scoreNumeric: number;
  scoreLetter: string;
  accuracy: string;   // e.g., "15 sec/day" or "—"
  reliability: string;
};

function fmtAccuracy(
  acc?: { value?: number; unit?: string; raw?: string }
): string {
  if (!acc) return "—";
  if (typeof acc.raw === "string" && acc.raw.trim()) return acc.raw;
  if (typeof acc.value === "number" && Number.isFinite(acc.value) && acc.unit) {
    return `${acc.value} ${acc.unit}`;
  }
  return "—";
}

export function toMovementQualityDTO(ai?: WatchAI): MovementQualityDTO {
  const mv = ai?.movement_quality;

  return {
    // Prefer the dedicated movement_quality.type, fall back to quick_facts.movement_type, else dash
    movement: mv?.type ?? ai?.quick_facts?.movement_type ?? "—",
    scoreNumeric: mv?.score?.numeric ?? 0,
    scoreLetter: mv?.score?.letter ?? "-",
    accuracy: fmtAccuracy(mv?.accuracy),
    reliability: mv?.reliability?.label ?? "—",
  };
}