// src/services/imagePaintRegistry.ts
class PaintRegistry {
  private seen = new Set<string>();
  has(k?: string) { return !!k && this.seen.has(k); }
  mark(k?: string) { if (k) this.seen.add(k); }
}
export const imagePaintRegistry = new PaintRegistry();
