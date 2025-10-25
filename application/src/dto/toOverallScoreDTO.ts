import { ServerWatch } from "@/types/watch";

export type OverallScoreDTO = {
  score: number;      // 0..100
  letter: string;     // A|B|C|D|-
  conclusion: string; // short text
};

export function toOverallScoreDTO(w: ServerWatch): OverallScoreDTO {
  const score = (w.overallNumeric ?? w.ai?.overall?.score?.numeric ?? 0) as number;
  const letter = (w.overallLetter ?? w.ai?.overall?.score?.letter ?? "-") as string;
  const conclusion = (w.ai?.overall?.conclusion ?? "—") as string;
  return { score, letter, conclusion };
}
