// src/services/thumbPrefetcher.ts
import { Image as XImage } from "expo-image";
import { Image as RNImage } from "react-native";
import { warmRegistry } from "./warmRegistry";

type Item = string | { uri: string; key?: string };

class ThumbPrefetcher {
    private q: { uri: string; key?: string }[] = [];
    private running = 0;
    private concurrency = 3;

    enqueue(items: Item[]) {
        for (const it of items) {
            if (typeof it === "string") this.q.push({ uri: it });
            else this.q.push({ uri: it.uri, key: it.key });
        }
        this.pump();
    }

    private pump() {
        while (this.running < this.concurrency && this.q.length) {
            const batch = this.q.splice(0, 4);
            this.running++;

            (async () => {
                for (const b of batch) {
                    // Prefer expo-image warm; types may not include cacheKey, so cast.
                    try {
                        // @ts-ignore: cacheKey exists at runtime on expo-image
                        await (XImage as any).loadAsync(b.key ? { uri: b.uri, cacheKey: b.key } : { uri: b.uri });
                        if (b.key) warmRegistry.mark(b.key);
                    } catch {
                        // Fallback to RN prefetch
                        try { await RNImage.prefetch(b.uri); } catch { }
                        if (b.key) warmRegistry.mark(b.key); 
                    }
                }
            })()
                .catch(() => { })
                .finally(() => {
                    this.running--;
                    this.pump();
                });
        }
    }
}

export const thumbPrefetcher = new ThumbPrefetcher();
