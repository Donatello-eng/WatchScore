// dto/materialsBuild.ts
import { WatchAI } from "@/types/watch";

export type MaterialsBuildDTO = {
  scoreNumeric: number;
  scoreLetter: string;
  totalWeightValue: number | null;
  totalWeightUnit?: string;
  caseMaterial?: string;
  crystalMaterial?: string;
  crystalCoating?: string;   // optional fallback if older JSON provides it
  buildQuality?: string;
  waterResValue: number | null;
  waterResUnit?: string;
};

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function toMaterialsBuildDTO(ai?: WatchAI): MaterialsBuildDTO {
  const mb = ai?.materials_build as any;

  return {
    scoreNumeric: mb?.score?.numeric ?? 0,
    scoreLetter: mb?.score?.letter ?? "-",

    totalWeightValue: num(mb?.total_weight?.value),
    totalWeightUnit: mb?.total_weight?.unit,

    // prefer structured field; fall back to older ".raw" if it exists
    caseMaterial: mb?.case_material?.material ?? mb?.case_material?.raw,

    crystalMaterial: mb?.crystal?.material,
    crystalCoating: mb?.crystal?.coating, // not in current schema, kept as soft fallback

    buildQuality: mb?.build_quality?.label,

    waterResValue: num(mb?.water_resistance?.value),
    waterResUnit: mb?.water_resistance?.unit,
  };
}