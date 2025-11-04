// hooks/useWarmWatchesOnBoot.ts
import { Image as XImage } from "expo-image";
import { saveHistorySnapshot, loadHistorySnapshot, type HistoryRow } from "@/services/historySnapshot";
import { warmRegistry } from "@/services/warmRegistry";
import React from "react";
import { apiFetch } from "@/api/http";

let bootRows: HistoryRow[] | null = null;
export function takeBootRows() { const r = bootRows; bootRows = null; return r; }

async function warmFirstN(rows: HistoryRow[], n: number) {
  const pairs = rows
    .map(r => (r.photoId && r.thumb) ? { uri: r.thumb!, key: `photo-${r.photoId}` } : null)
    .filter(Boolean)
    .slice(0, n) as { uri: string; key: string }[];

  await Promise.allSettled(
    pairs.map(({ uri, key }) =>
      // @ts-ignore cacheKey exists at runtime
      (XImage as any).loadAsync({ uri, cacheKey: key, cachePolicy: "memory-disk" })
        .then(() => warmRegistry.mark(key))
    )
  );
}

export function useWarmWatchesOnBoot(count = 8, softTimeoutMs = 0) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Snapshot → hydrate rows immediately but DO NOT render yet
      const snap = loadHistorySnapshot();
      if (snap?.length) {
        bootRows = snap;
        // Warm exactly what the first screen will show
        await (softTimeoutMs > 0
          ? Promise.race([warmFirstN(snap, count), new Promise(r => setTimeout(r, softTimeoutMs))])
          : warmFirstN(snap, count));
        if (!cancelled) setReady(true);
      }

      // 2) Network refresh → persist + warm in background (no gating)
      try {
        const res = await apiFetch(`/watches?limit=${Math.max(24, count)}`);
        const data = await res.json();
        if (cancelled) return;

        const rows: HistoryRow[] = (data.items ?? []).map((it: any) => {
          const p = it?.photos?.[0];
          return {
            id: it.id,
            photoId: p?.id ?? undefined,
            thumb: p?.url ?? null,
            name: it.name ?? null,
            year: it.year ?? null,
            score: it.overallLetter || it.overallNumeric != null
              ? { letter: it.overallLetter ?? undefined, numeric: it.overallNumeric ?? null }
              : null,
            price: it.price ?? null,
            status: it.status,
            updatedAt: it.updatedAt ?? null,
          };
        });

        bootRows = rows;
        saveHistorySnapshot(rows);

        // Refresh cache for newer items, but don’t block UI
        void warmFirstN(rows, Math.max(count, 12));
        if (!snap?.length) {
          // Cold boot with no snapshot: at least gate once on network warm
          await (softTimeoutMs > 0
            ? Promise.race([warmFirstN(rows, count), new Promise(r => setTimeout(r, softTimeoutMs))])
            : warmFirstN(rows, count));
          if (!cancelled) setReady(true);
        }
      } finally {
        if (!cancelled && !ready) setReady(true); // final safety, usually no-op
      }
    })();

    return () => { cancelled = true; };
  }, [count, softTimeoutMs]);

  return ready;
}
