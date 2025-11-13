// app/components/Thumb.tsx
import React from "react";
import {
  Image,
  type ImageSourcePropType,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { warmRegistry } from "@/services/warmRegistry";
import { getStableUri, bumpUri } from "@/services/stableThumbUri";
import { imagePaintRegistry } from "@/services/imagePaintRegistry";

type Props = { photoId?: number; uri?: string | null; size: number; debug?: boolean };

export default function Thumb({ photoId, uri, size, debug }: Props) {
  const radius = size * 0.22;

  // Empty placeholder
  if (!uri || !photoId) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: "rgba(0,0,0,0.06)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="watch-outline"
          size={Math.round(size * 0.44)}
          color="#9AA1AE"
        />
      </View>
    );
  }

  const cacheKey = `photo-${photoId}`;
  const alreadyPainted = imagePaintRegistry.has(cacheKey); // kept in case you want to use it later

  const fresh = uri;
  const canonical = getStableUri(photoId, fresh);

  const [displayUri, setDisplayUri] = React.useState<string | null>(
    canonical ?? null
  );

  // Warm + swap once the stable URI is ready
  React.useEffect(() => {
    if (!canonical || canonical === displayUri) return;

    if (warmRegistry.has(cacheKey)) {
      setDisplayUri(canonical);
    } else {
      // React Native prefetch only – no expo-image
      Image.prefetch(canonical)
        .then((ok) => {
          if (!ok) return;
          warmRegistry.mark(cacheKey);
          setDisplayUri(canonical);
        })
        .catch(() => {
          // keep old displayUri on failure
        });
    }
  }, [canonical, cacheKey, displayUri]);

  const src = React.useMemo<ImageSourcePropType | undefined>(
    () => (displayUri ? { uri: displayUri } : undefined),
    [displayUri]
  );

  let t0 = 0;
  let sawProgress = false;

  return (
    <Image
      source={src as ImageSourcePropType}
      resizeMode="cover"
      style={{ width: size, height: size, borderRadius: radius }}
      onLoadStart={() => {
        t0 = Date.now();
        if (debug) console.log(`[thumb] start ${cacheKey}`);
      }}
      onProgress={() => {
        sawProgress = true;
      }}
      onError={() => {
        if (canonical !== fresh) bumpUri(photoId, fresh);
      }}
      onLoadEnd={() => {
        imagePaintRegistry.mark(cacheKey);
        bumpUri(photoId, fresh);
        if (debug) {
          const dt = Date.now() - t0;
          const kind =
            !sawProgress && dt < 60
              ? "memory?"
              : dt < 180
              ? "disk?"
              : "network?";
          console.log(`[thumb] end   ${cacheKey} ${dt}ms  ${kind}`);
        }
      }}
    />
  );
}
