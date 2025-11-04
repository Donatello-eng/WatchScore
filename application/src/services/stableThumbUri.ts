// src/services/stableThumbUri.ts
type Val = { uri: string; ts: number };
const map = new Map<number, Val>();
const TTL_MS = 30 * 60 * 1000; // 30 min, adjust to presign expiry

export function getStableUri(id?: number, fresh?: string | null) {
  if (!id) return fresh ?? undefined;
  const v = map.get(id);
  const expired = !v || (Date.now() - v.ts > TTL_MS);
  if (expired && fresh) {
    map.set(id, { uri: fresh, ts: Date.now() });
    return fresh;
  }
  return v?.uri ?? fresh ?? undefined;
}

export function bumpUri(id?: number, fresh?: string | null) {
  if (!id || !fresh) return;
  map.set(id, { uri: fresh, ts: Date.now() });
}
