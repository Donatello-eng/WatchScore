import { ServerWatch } from "@/types/watch";

export type MaintenanceRisksDTO = {
  scoreNumeric: number;
  scoreLetter: string;
  serviceIntervalMin: number | null;
  serviceIntervalMax: number | null;
  serviceCostRaw?: string;
  serviceCostAmountMin: number | null;
  serviceCostAmountMax: number | null;
  serviceCostCurrency: string | null;
  partsAvailability?: string;
  serviceability?: string;
  weakPoints?: string[];
};

export function toMaintenanceRisksDTO(w: ServerWatch): MaintenanceRisksDTO {
  const mr = (w.ai as any)?.maintenance_risks ?? {};
  return {
    scoreNumeric: mr?.score?.numeric ?? 0,
    scoreLetter: mr?.score?.letter ?? "-",
    serviceIntervalMin: mr?.service_interval?.min ?? null,
    serviceIntervalMax: mr?.service_interval?.max ?? null,
    serviceCostRaw: mr?.service_cost?.raw,
    serviceCostAmountMin: mr?.service_cost?.min ?? null,
    serviceCostAmountMax: mr?.service_cost?.max ?? null,
    serviceCostCurrency: mr?.service_cost?.currency ?? null,
    partsAvailability: mr?.parts_availability?.label ?? undefined,
    serviceability: mr?.serviceability?.raw ?? undefined,
    weakPoints: Array.isArray(mr?.known_weak_points)
      ? mr.known_weak_points.filter(Boolean)
      : undefined,
  };
}
