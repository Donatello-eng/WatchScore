import { Money } from "@/types/watch";

export function currencyToSymbol(c?: string) {
  const map: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
  return c ? map[c] ?? "$" : "$";
}

export function fmtMoney(p?: Money) {
  const sym = currencyToSymbol(p?.currency);
  if (!p) return `– ${sym}`;
  if (p.raw && String(p.raw).trim()) {
    const num = String(p.raw).replace(/[^0-9.,]/g, "");
    return num ? `${num} ${sym}` : `– ${sym}`;
  }
  if (p.amount != null) return `${p.amount} ${sym}`;
  return `– ${sym}`;
}
