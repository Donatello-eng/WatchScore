import { ServerWatch } from "@/types/watch";

export type MaterialsBuildDTO = {
  scoreNumeric: number;
  scoreLetter: string;
  totalWeightValue: number | null;
  totalWeightUnit?: string;
  caseMaterial?: string;
  crystalMaterial?: string;
  crystalCoating?: string;
  buildQuality?: string;
  waterResValue: number | null;
  waterResUnit?: string;
};

export function toMaterialsBuildDTO(w: ServerWatch): MaterialsBuildDTO {
  const mb = (w.ai as any)?.materials_build ?? {};
  return {
    scoreNumeric: mb?.score?.numeric ?? 0,
    scoreLetter: mb?.score?.letter ?? "-",
    totalWeightValue: typeof mb?.total_weight?.value === "number" ? mb.total_weight.value : null,
    totalWeightUnit: mb?.total_weight?.unit,
    caseMaterial: mb?.case_material?.raw ?? mb?.case_material?.material,
    crystalMaterial: mb?.crystal?.material,
    crystalCoating: mb?.crystal?.coating,
    buildQuality: mb?.build_quality?.label,
    waterResValue: typeof mb?.water_resistance?.value === "number" ? mb.water_resistance.value : null,
    waterResUnit: mb?.water_resistance?.unit,
  };
}
