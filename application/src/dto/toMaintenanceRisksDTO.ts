// dto/maintenanceRisks.ts
import { WatchAI } from "@/types/watch";

export type MaintenanceRisksDTO = {
  scoreNumeric: number;
  scoreLetter: string;

  serviceIntervalMin: number | null;
  serviceIntervalMax: number | null;
  serviceIntervalUnit?: string;

  serviceCostRaw?: string;           // legacy fallback if present
  serviceCostAmountMin: number | null;
  serviceCostAmountMax: number | null;
  serviceCostCurrency: string | null;

  partsAvailability?: string;
  serviceability?: string;
  weakPoints?: string[];
};

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function toMaintenanceRisksDTO(ai?: WatchAI): MaintenanceRisksDTO {
  const mr = (ai as any)?.maintenance_risks ?? {};

  return {
    scoreNumeric: mr?.score?.numeric ?? 0,
    scoreLetter: mr?.score?.letter ?? "-",

    serviceIntervalMin: num(mr?.service_interval?.min),
    serviceIntervalMax: num(mr?.service_interval?.max),
    serviceIntervalUnit: mr?.service_interval?.unit, // "y"

    serviceCostRaw: mr?.service_cost?.raw, // not in new schema; harmless if absent
    serviceCostAmountMin: num(mr?.service_cost?.min),
    serviceCostAmountMax: num(mr?.service_cost?.max),
    serviceCostCurrency: mr?.service_cost?.currency ?? null,

    partsAvailability: mr?.parts_availability?.label ?? undefined,
    serviceability: mr?.serviceability?.raw ?? mr?.serviceability ?? undefined,

    weakPoints: Array.isArray(mr?.known_weak_points)
      ? mr.known_weak_points
          .filter((s: any) => typeof s === "string" && s.trim().length > 0)
          .map((s: string) => s.trim())
      : undefined,
  };
}