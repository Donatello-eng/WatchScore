export function decodeJsonParam<T = unknown>(v?: string | string[] | null): T | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(raw)) as T; } catch { return null; }
}
