import { ServerWatch } from "@/types/watch";

export type ValueMoneyDTO = {
  scoreNumeric: number;
  scoreLetter: string;
  listPriceRaw?: string;
  listPriceAmount: number | null;
  listPriceCurrency: string | null;
  resaleRaw?: string;
  resaleAmount: number | null;
  resaleCurrency: string | null;
  marketLiquidity?: string;
  holdingLabel?: string;
  holdingNote?: string;
  valueForWearer?: string;
  valueForCollector?: string;
  specEffLabel?: string;
  specEffNote?: string;
};

export function toValueMoneyDTO(w: ServerWatch): ValueMoneyDTO {
  const vfm = (w.ai as any)?.value_for_money ?? {};
  return {
    scoreNumeric: vfm?.score?.numeric ?? 0,
    scoreLetter: vfm?.score?.letter ?? "-",
    listPriceRaw: vfm?.list_price?.raw,
    listPriceAmount: vfm?.list_price?.amount ?? null,
    listPriceCurrency: vfm?.list_price?.currency ?? null,
    resaleRaw: vfm?.resale_average?.raw,
    resaleAmount: vfm?.resale_average?.amount ?? null,
    resaleCurrency: vfm?.resale_average?.currency ?? null,
    marketLiquidity: vfm?.market_liquidity?.label ?? undefined,
    holdingLabel: vfm?.holding_value?.label ?? undefined,
    holdingNote: vfm?.holding_value?.note ?? undefined,
    valueForWearer: vfm?.value_for_wearer?.label ?? undefined,
    valueForCollector: vfm?.value_for_collector?.label ?? undefined,
    specEffLabel: vfm?.spec_efficiency_note?.label ?? undefined,
    specEffNote: vfm?.spec_efficiency_note?.note ?? undefined,
  };
}
