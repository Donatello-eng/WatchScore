// dto/overall.ts
import { WatchAI } from "@/types/watch";

export type OverallScoreDTO = {
  score: number;      // 0..100
  letter: string;     // A|B|C|D|-
  conclusion: string; // short text
};

function clamp01to100(n: unknown) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(x)));
}

function scoreToLetter(n: number) {
  if (n >= 90) return "A";
  if (n >= 75) return "B";
  if (n >= 60) return "C";
  if (n >= 0)  return "D";
  return "-";
}

export function toOverallScoreDTO(ai?: WatchAI): OverallScoreDTO {
  const numeric = clamp01to100(ai?.overall?.score?.numeric);
  const letter =
    ai?.overall?.score?.letter ??
    scoreToLetter(numeric);

  const conclusion = ai?.overall?.conclusion || "—";

  return { score: numeric, letter, conclusion };
}