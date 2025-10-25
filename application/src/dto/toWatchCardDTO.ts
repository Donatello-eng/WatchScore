import { Money, ServerWatch } from "@/types/watch";

export type WatchCardDTO = {
  name: string;
  subtitle?: string;
  year?: number | null;
  movement?: string;
  price?: Money;
  photos: string[]; // displayable URLs
};

export function toWatchCardDTO(w: ServerWatch): WatchCardDTO {
  const name = w.name ?? w.ai?.name ?? "";
  const subtitle = w.subtitle ?? w.ai?.subtitle ?? "";
  const year = w.ai?.meta?.release_year ?? w.year ?? null;
  const movement = w.ai?.movement_quality?.type ?? "–";
  const price = w.ai?.value_for_money?.list_price;

  const photos =
    (w.photos ?? [])
      .map(ph =>
        ph?.url ??
        (ph?.path ? `${process.env.API_BASE}${ph.path.startsWith("/") ? "" : "/"}${ph.path}` : null)
      )
      .filter(Boolean) as string[];

  return { name, subtitle, year, movement, price, photos };
}
