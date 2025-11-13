// src/services/thumbPrefetcher.ts
import { Image as RNImage } from "react-native";
import { warmRegistry } from "./warmRegistry";

type Item = string | { uri: string; key?: string };

class ThumbPrefetcher {
  private q: { uri: string; key?: string }[] = [];
  private running = 0;
  private concurrency = 3;

  enqueue(items: Item[]) {
    for (const it of items) {
      if (typeof it === "string") {
        this.q.push({ uri: it });
      } else {
        this.q.push({ uri: it.uri, key: it.key });
      }
    }
    this.pump();
  }

  private pump() {
    while (this.running < this.concurrency && this.q.length) {
      const batch = this.q.splice(0, 4);
      this.running++;

      (async () => {
        for (const b of batch) {
          try {
            const ok = await RNImage.prefetch(b.uri);
            if (ok && b.key) {
              warmRegistry.mark(b.key);
            }
          } catch {
            // ignore prefetch failures, just don't mark warm
          }
        }
      })()
        .catch(() => {
          // swallow any unexpected error inside the batch
        })
        .finally(() => {
          this.running--;
          this.pump();
        });
    }
  }
}

export const thumbPrefetcher = new ThumbPrefetcher();
