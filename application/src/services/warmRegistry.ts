// src/services/warmRegistry.ts
class WarmRegistry {
  private keys = new Set<string>();
  has(key?: string) { return !!key && this.keys.has(key); }
  mark(key?: string) { if (key) this.keys.add(key); }
  clear() { this.keys.clear(); }
}
export const warmRegistry = new WarmRegistry();
