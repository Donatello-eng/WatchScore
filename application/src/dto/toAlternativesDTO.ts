import { ServerWatch } from "@/types/watch";
import { Money } from "@/types/watch";

export type AlternativeDTO = { model?: string; movement?: string; price?: Money };
export type AlternativesDTO = { items: AlternativeDTO[] };

export function toAlternativesDTO(w: ServerWatch): AlternativesDTO {
  const alts = (w.ai as any)?.alternatives;
  if (!Array.isArray(alts)) return { items: [] };
  return {
    items: alts.map((a: any) => ({
      model: a?.model ?? "—",
      movement: a?.movement ?? "—",
      price: a?.price ?? undefined,
    })),
  };
}
