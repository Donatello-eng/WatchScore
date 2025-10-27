import { Money, ServerWatch, WatchAI } from "@/types/watch";

const pickNum = (...vals: any[]) =>
  vals.find(v => typeof v === "number" && Number.isFinite(v) && v > 0) ?? null;

export type WatchCardDTO = {
  name: string;
  subtitle?: string;
  year?: number | null;
  movement?: string;
  price?: Money;
  photos: string[];
};

export function toWatchCardDTO(w: ServerWatch, ai?: WatchAI): WatchCardDTO {
  const qf = ai?.quick_facts;

  const name = qf?.name ?? "—";
  const subtitle = qf?.subtitle || undefined;
  const year = pickNum(qf?.release_year);
  const movement = qf?.movement_type ?? ai?.movement_quality?.type ?? "—";
  const price = qf?.list_price ?? ai?.value_for_money?.list_price;

  const photos =
    (w.photos ?? [])
      .map(ph =>
        ph?.url ??
        (ph?.path ? `${process.env.API_BASE}${ph.path.startsWith("/") ? "" : "/"}${ph.path}` : null)
      )
      .filter(Boolean) as string[];

  return { name, subtitle, year, movement, price, photos };
}