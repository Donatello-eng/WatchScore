// src/services/historySnapshot.ts

// Minimal interface the app uses
type KvLike = {
  getString(k: string): string | undefined;
  set(k: string, v: string): void;
};

// Runtime import so TS can’t erase the value
let storage: KvLike;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MMKV } = require("react-native-mmkv") as {
    MMKV: new (cfg?: { id?: string }) => KvLike;
  };
  storage = new MMKV({ id: "history-snapshot" });
} catch {
  // Safe fallback for web/tests
  const map = new Map<string, string>();
  storage = {
    getString: (k) => map.get(k),
    set: (k, v) => map.set(k, v),
  };
}

export { storage };

const KEY = "rows-v1";

// Optional: type your persisted rows
export type HistoryRow = {
  id: number;
  photoId?: number;
  thumb?: string | null;
  name?: string | null;
  year?: number | null;
  score?: { letter?: string; numeric?: number | null } | null;
  price?: any | null;
  status?: string;
  updatedAt?: string | null;
};

export function saveHistorySnapshot(rows: HistoryRow[] | null | undefined) {
  if (!rows?.length) return; // no write on null/empty
  try {
    storage.set(KEY, JSON.stringify(rows.slice(0, 50)));
  } catch {}
}

export function loadHistorySnapshot(): HistoryRow[] {
  try {
    const s = storage.getString(KEY);
    return s ? (JSON.parse(s) as HistoryRow[]) : [];
  } catch {
    return [];
  }
}
