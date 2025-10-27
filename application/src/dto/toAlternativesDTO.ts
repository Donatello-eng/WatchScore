// dto/alternatives.ts
import { WatchAI, Money } from "@/types/watch";

export type AlternativeDTO = {
  model?: string;
  movement?: string;
  price?: Money;
};
export type AlternativesDTO = { items: AlternativeDTO[] };

const asMoney = (p: any): Money | undefined => {
  if (!p || typeof p !== "object") return undefined;
  const amount =
    typeof p.amount === "number" && Number.isFinite(p.amount) ? p.amount : undefined;
  const currency = typeof p.currency === "string" ? p.currency : undefined;
  const raw = typeof p.raw === "string" ? p.raw : undefined;
  return amount != null || currency || raw ? { amount, currency, raw } : undefined;
};

export function toAlternativesDTO(ai?: WatchAI): AlternativesDTO {
  const alts = (ai as any)?.alternatives;
  if (!Array.isArray(alts)) return { items: [] };

  const items = alts
    .map((a: any): AlternativeDTO => ({
      model: typeof a?.model === "string" && a.model.trim() ? a.model.trim() : "—",
      movement: typeof a?.movement === "string" && a.movement.trim() ? a.movement.trim() : "—",
      price: asMoney(a?.price),
    }))
    // optional: drop completely empty rows (no model, no movement, no price)
    .filter(it => it.model !== "—" || it.movement !== "—" || it.price);

  return { items };
}