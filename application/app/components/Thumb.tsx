// app/components/Thumb.tsx
import React from "react";
import { Image as XImage, type ImageSource } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { warmRegistry } from "@/services/warmRegistry";
import { getStableUri, bumpUri } from "@/services/stableThumbUri";
import { imagePaintRegistry } from "@/services/imagePaintRegistry";

type Props = { photoId?: number; uri?: string | null; size: number; debug?: boolean };

export default function Thumb({ photoId, uri, size, debug }: Props) {
  const radius = size * 0.22;

  if (!uri || !photoId) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="watch-outline" size={Math.round(size * 0.44)} color="#9AA1AE" />
      </View>
    );
  }

  const cacheKey = `photo-${photoId}`;
  const alreadyPainted = imagePaintRegistry.has(cacheKey);

  const fresh = uri;
  const canonical = getStableUri(photoId, fresh);

  const [displayUri, setDisplayUri] = React.useState<string | null>(canonical ?? null);

  React.useEffect(() => {
    if (!canonical || canonical === displayUri) return;

    if (warmRegistry.has(cacheKey)) {
      setDisplayUri(canonical);
    } else {
      XImage.loadAsync({ uri: canonical, cacheKey } as ImageSource)
        .then(() => {
          // mark as warm for this key and then swap
          warmRegistry.mark(cacheKey);
          setDisplayUri(canonical);
        })
        .catch(() => { /* keep old displayUri */ });
    }
  }, [canonical, cacheKey, displayUri]);

  const src = React.useMemo(
    () => (displayUri ? ({ uri: displayUri, cacheKey } as ImageSource) : undefined),
    [displayUri, cacheKey]
  );

  let t0 = 0, sawProgress = false;

  return (
    <XImage
      source={src}
      cachePolicy="memory-disk"        // <-- prop, not inside source
      recyclingKey={cacheKey}
      allowDownscaling
      priority="high"
      transition={0}
      contentFit="cover"
      style={{ width: size, height: size, borderRadius: radius }}
      onLoadStart={() => { t0 = Date.now(); if (debug) console.log(`[thumb] start ${cacheKey}`); }}
      onProgress={() => { sawProgress = true; }}
      onError={() => {
        if (canonical !== fresh) bumpUri(photoId, fresh);
      }}
      onLoadEnd={() => {
        imagePaintRegistry.mark(cacheKey);
        bumpUri(photoId, fresh);
        if (debug) {
          const dt = Date.now() - t0;
          const kind = !sawProgress && dt < 60 ? "memory?" : dt < 180 ? "disk?" : "network?";
          console.log(`[thumb] end   ${cacheKey} ${dt}ms  ${kind}`);
        }
      }}
    />
  );
}
