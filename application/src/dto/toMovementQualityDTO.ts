import { ServerWatch } from "@/types/watch";

export type MovementQualityDTO = {
  movement: string;
  scoreNumeric: number;
  scoreLetter: string;
  accuracy: string;   // "15 sec/day" or raw string
  reliability: string;
};

export function toMovementQualityDTO(w: ServerWatch): MovementQualityDTO {
  const mv = w.ai?.movement_quality as any;
  const accuracyRaw =
    mv?.accuracy?.raw ??
    (typeof mv?.accuracy?.value === "number" && mv?.accuracy?.unit
      ? `${mv.accuracy.value} ${mv.accuracy.unit}`
      : "–");

  return {
    movement: mv?.type ?? "–",
    scoreNumeric: mv?.score?.numeric ?? 0,
    scoreLetter: mv?.score?.letter ?? "-",
    accuracy: accuracyRaw,
    reliability: mv?.reliability?.label ?? "–",
  };
}
