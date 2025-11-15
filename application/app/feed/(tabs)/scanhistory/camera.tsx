// app/camera.tsx (adjust path if needed)
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  StyleSheet as RNStyleSheet,
  Animated,
  Easing,
  InteractionManager,
  Linking,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useR } from "@/../hooks/useR";
import { Font } from "@/../hooks/fonts";
import * as ImagePicker from "expo-image-picker";
import { useIsFocused } from "@react-navigation/native";

import {
  initWatchPresign,
  putToS3,
  finalizeWatch,
} from "@/../src/api/directS3";

import * as ImageManipulator from "expo-image-manipulator";
import DotsEllipsis from "@/components/loading/DotsEllipsis";
import { triggerHaptic } from "hooks/haptics";
import PermissionRequired from "@/../app/components/permissionRequired";

const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.75;
const MIN_INTERVAL_MS = 450; // small debounce between shots

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (w, h) => resolve({ width: w, height: h }),
      (err) => reject(err)
    );
  });
}

export async function shrinkAndNormalize(uri: string, maxEdge = MAX_EDGE) {
  let w = 0,
    h = 0;
  try {
    const dims = await getImageSize(uri);
    w = dims.width;
    h = dims.height;
  } catch {
    const out = await ImageManipulator.manipulateAsync(uri, [], {
      compress: WEBP_QUALITY,
      format: ImageManipulator.SaveFormat.WEBP,
      base64: false,
    });
    return { uri: out.uri, mime: "image/webp" };
  }

  const longest = Math.max(w, h);
  if (longest <= maxEdge) {
    const out = await ImageManipulator.manipulateAsync(uri, [], {
      compress: WEBP_QUALITY,
      format: ImageManipulator.SaveFormat.WEBP,
      base64: false,
    });
    return { uri: out.uri, mime: "image/webp" };
  }

  const scale = maxEdge / longest;
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: targetW, height: targetH } }],
    {
      compress: WEBP_QUALITY,
      format: ImageManipulator.SaveFormat.WEBP,
      base64: false,
    }
  );
  return { uri: out.uri, mime: "image/webp" };
}

export default function CameraScreen() {
  const { scale, vw, vh } = useR();
  const insets = useSafeAreaInsets();
  const camRef = useRef<CameraView>(null);
  const mounted = useRef(true);

  const [permission, requestPermission] = useCameraPermissions();
  const lastShotAtRef = useRef(0);

  // --- SHUTTER FX ANIMATIONS ---
  const flashOpacity = useRef(new Animated.Value(0)).current; // white flash
  const camScale = useRef(new Animated.Value(1)).current; // camera zoom-pop
  const shutterScale = useRef(new Animated.Value(1)).current; // shutter pulse
  const rippleScale = useRef(new Animated.Value(0.7)).current; // ring ripple
  const rippleOpacity = useRef(new Animated.Value(0)).current; // ring ripple
  const INITIAL_SLOTS: Array<string | null> = [null, null, null];

  const [slots, setSlots] = useState<Array<string | null>>(INITIAL_SLOTS);
  const [submitting, setSubmitting] = useState(false);
  const [shutterLocked, setShutterLocked] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);

  const isFocused = useIsFocused();

  useFocusEffect(
    React.useCallback(() => {
      // Every time the camera screen becomes active, start fresh
      setSlots(INITIAL_SLOTS);
      setSubmitting(false);
      setShutterLocked(false);
      setPendingSlot(null);
      lastShotAtRef.current = 0;

      return undefined; // no cleanup needed
    }, [])
  );



  const playShutterFX = () => {
    triggerHaptic("impactLight");

    const flashIn = Animated.timing(flashOpacity, {
      toValue: 1,
      duration: 0,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const flashOut = Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 60,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });

    const camIn = Animated.timing(camScale, {
      toValue: 0.985,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const camOut = Animated.timing(camScale, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    const shutterIn = Animated.timing(shutterScale, {
      toValue: 0.94,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const shutterOut = Animated.spring(shutterScale, {
      toValue: 1,
      damping: 10,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true,
    });

    rippleScale.setValue(0.7);
    rippleOpacity.setValue(0.18);
    const rippleAnim = Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1.4,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([
      Animated.sequence([flashIn, flashOut]),
      Animated.sequence([camIn, camOut]),
      Animated.sequence([shutterIn, shutterOut]),
      rippleAnim,
    ]).start();
  };
  // --- END FX ---

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  // (Optional) You may want to remove this auto-request to avoid consuming the only prompt window.
  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <PermissionRequired
        canAskAgain={permission.canAskAgain}
        onRequestPermission={async () => {
          const res = await requestPermission();
          return {
            granted: !!res?.granted,
            canAskAgain:
              typeof res?.canAskAgain === "boolean"
                ? res.canAskAgain
                : permission.canAskAgain,
          };
        }}
      />
    );
  }

  const allFull = slots.every(Boolean);

  // Thumbnail loaded/errored => unlock if it was the pending one
  const onThumbSettled = (idx: number) => {
    if (pendingSlot === idx) {
      setPendingSlot(null);
      setShutterLocked(false);
      lastShotAtRef.current = Date.now();
    }
  };

  const takePhoto = async () => {
    if (shutterLocked) return;
    const now = Date.now();
    if (now - lastShotAtRef.current < MIN_INTERVAL_MS) return;
    if (allFull) return;

    // Choose slot ONCE and stick to it
    const slotIndex = (() => {
      const i = slots.findIndex((s) => s === null);
      return i === -1 ? slots.length - 1 : i;
    })();

    // Lock shutter until the thumbnail really renders
    setShutterLocked(true);
    setPendingSlot(slotIndex);

    try {
      playShutterFX();

      // Capture fast
      const res: any = await camRef.current?.takePictureAsync({
        quality: 1,
        skipProcessing: true,
        shutterSound: false,
      });
      const rawUri: string | undefined = res?.uri;
      if (!rawUri) {
        // unlock on failure
        setPendingSlot(null);
        setShutterLocked(false);
        return;
      }

      // Show raw preview immediately in the reserved slot
      setSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = rawUri;
        return next;
      });

      // Compress/swizzle after interactions; swap in if unchanged
      InteractionManager.runAfterInteractions(async () => {
        try {
          const { uri: smallUri } = await shrinkAndNormalize(rawUri);
          if (!mounted.current) return;
          setSlots((prev) => {
            const next = [...prev];
            if (next[slotIndex] === rawUri) next[slotIndex] = smallUri;
            return next;
          });
          // Note: onLoadEnd will fire again for the processed image too.
          // We already unlock on the first onLoadEnd; double calls are harmless.
        } catch (e) {
          console.warn("shrinkAndNormalize error", e);
        }
      });
    } catch (e) {
      console.warn("takePicture error", e);
      setPendingSlot(null);
      setShutterLocked(false);
    }
  };

  const removeSlot = (index: number) =>
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });

  const CORNER = {
    size: scale(100),
    radius: scale(48),
    stroke: scale(10),
  };

  const cornerDims = {
    width: CORNER.size,
    height: CORNER.size,
    borderTopLeftRadius: CORNER.radius,
    borderTopWidth: CORNER.stroke,
    borderLeftWidth: CORNER.stroke,
  };

  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        await Linking.openSettings();
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], // <- new API
        allowsEditing: false,
        quality: 1, // pick original; compress after
        //  allowsMultipleSelection: true, // default false; omit selectionLimit
        exif: false,
        base64: false,
      });

      if (res.canceled) return;
      const rawUri = res.assets?.[0]?.uri;
      if (!rawUri) return;

      const { uri: smallUri } = await shrinkAndNormalize(rawUri);

      setSlots((prev) => {
        const i = prev.findIndex((s) => s === null);
        const next = [...prev];
        if (i === -1) next[next.length - 1] = smallUri;
        else next[i] = smallUri;
        return next;
      });
    } catch (e) {
      console.warn("pickFromGallery error", e);
    }
  };

  const PILL_HEIGHT = scale(84);

  return (
    <View style={styles.root}>
      {/* Camera with scale pop */}
      <Animated.View
        style={[
          RNStyleSheet.absoluteFill,
          { transform: [{ scale: camScale }] },
        ]}
      >
        {isFocused && !submitting && (
          <CameraView
            ref={camRef}
            style={RNStyleSheet.absoluteFill}
            facing="back"
            animateShutter={false}
          />
        )}
      </Animated.View>

      {/* White flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          RNStyleSheet.absoluteFill,
          { backgroundColor: "#232323ff", opacity: flashOpacity },
        ]}
      />

      {/* Back chevron (overlay, respects safe area) */}
      <View style={RNStyleSheet.absoluteFill} pointerEvents="box-none">
        <Pressable
          hitSlop={12}
          onPress={() => {
            triggerHaptic("impactMedium");
            router.back();
          }}
          style={[styles.backBtn, { top: insets.top + 15 }]} // <= key change
        >
          <Image
            source={require("@/../assets/images/chevron-left.webp")}
            style={styles.backIcon}
          />
        </Pressable>
      </View>

      {/* Brackets */}
      <View
        style={[
          styles.bracketArea,
          {
            width: vw(76),
            height: vh(34),
            left: (vw(100) - vw(76)) / 2,
            top: vh(15),
          },
        ]}
      >
        {/* TL */}
        <View style={[styles.corner, cornerDims, { top: 0, left: 0 }]} />
        {/* TR */}
        <View
          style={[
            styles.corner,
            cornerDims,
            { top: 0, right: 0, transform: [{ rotate: "90deg" }] },
          ]}
        />
        {/* BR */}
        <View
          style={[
            styles.corner,
            cornerDims,
            { bottom: 0, right: 0, transform: [{ rotate: "180deg" }] },
          ]}
        />
        {/* BL */}
        <View
          style={[
            styles.corner,
            cornerDims,
            { bottom: 0, left: 0, transform: [{ rotate: "-90deg" }] },
          ]}
        />
      </View>

      {/* Bottom cluster */}
      <View
        style={{
          position: "absolute",
          left: vw(7),
          right: vw(7),
          bottom: insets.bottom + vh(2),
          alignItems: "center",
          opacity: submitting ? 0.6 : 1,
        }}
        pointerEvents={submitting ? "none" : "auto"}
      >
        {/* Thumbnails */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: scale(14),
            marginBottom: vh(2),
          }}
        >
          {slots.map((uri, idx) => (
            <View
              key={idx}
              style={{
                position: "relative",
                width: scale(64),
                height: scale(64),
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: scale(12),
                  overflow: "hidden",
                  backgroundColor: "rgba(255,255,255,0.35)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    onLoadEnd={() => {
                      // unlock only when the pending slot’s preview actually rendered
                      onThumbSettled(idx);
                    }}
                    onError={() => {
                      // don’t deadlock if preview fails
                      onThumbSettled(idx);
                    }}
                  />
                ) : (
                  <Image
                    source={require("@/../assets/images/gallery.webp")}
                    style={{
                      width: scale(28),
                      height: scale(28),
                      tintColor: "#8E8E93",
                    }}
                    resizeMode="contain"
                  />
                )}
              </View>

              {uri && (
                <Pressable
                  onPress={() => {
                    triggerHaptic("impactMedium");
                    removeSlot(idx);
                  }}
                  style={{
                    position: "absolute",
                    top: -scale(6),
                    right: -scale(6),
                    width: scale(20),
                    height: scale(20),
                    borderRadius: scale(5),
                    backgroundColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#ff0a0aff",
                      fontFamily: Font.inter.extraBold,
                      fontSize: scale(17),
                      lineHeight: scale(17),
                    }}
                  >
                    ×
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* Bottom control pill */}
        {!slots.every(Boolean) ? (
          <View
            style={{
              width: "100%",
              backgroundColor: "rgba(31,31,31,0.4)",
              borderRadius: scale(28),
              height: PILL_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* left: Gallery */}
            <Pressable
              onPress={() => {
                triggerHaptic("impactMedium");
                pickFromGallery();
              }}
              style={{
                position: "absolute",
                left: scale(48),
                top: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("@/../assets/images/gallery.webp")}
                style={{
                  width: scale(30),
                  height: scale(30),
                  tintColor: "#FFFFFF",
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  marginTop: scale(0),
                  color: "#FFFFFF",
                  fontFamily: Font.inter.medium,
                  fontSize: scale(12),
                  textAlign: "center",
                }}
              >
                Gallery
              </Text>
            </Pressable>

            {/* center: shutter (disabled while waiting for preview) */}
            <Pressable
              onPress={takePhoto}
              disabled={shutterLocked || slots.every(Boolean)}
              style={{
                alignItems: "center",
                justifyContent: "center",
                opacity: shutterLocked || slots.every(Boolean) ? 0.6 : 1,
              }}
            >
              {/* ripple ring */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: scale(92),
                  height: scale(92),
                  borderRadius: scale(46),
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.5)",
                  transform: [{ scale: rippleScale }],
                  opacity: rippleOpacity,
                }}
              />
              {/* shutter image (pulses) */}
              <Animated.Image
                source={require("@/../assets/images/shutter.webp")}
                style={{
                  width: scale(74),
                  height: scale(74),
                  transform: [{ scale: shutterScale }],
                }}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        ) : (
          // Solid green "Continue" pill
          <Pressable
            disabled={submitting}
            onPress={() => {
              if (submitting) return;
              setSubmitting(true);          // this makes {!submitting && <CameraView/>} false

              requestAnimationFrame(async () => {
                try {
                  const imgs = (slots.filter(Boolean) as string[]).slice(0, 3);
                  if (imgs.length === 0) return;

                  const processed = await Promise.all(imgs.map((u) => shrinkAndNormalize(u)));
                  const contentTypes = processed.map((p) => p.mime);
                  const { watchId, uploads } = await initWatchPresign(
                    processed.length,
                    contentTypes
                  );

                  for (let i = 0; i < processed.length; i++) {
                    await putToS3(uploads[i].uploadUrl, processed[i].uri, uploads[i].headers);
                  }

                  await finalizeWatch(
                    watchId,
                    uploads.map((u) => u.key)
                  );

                  router.replace({
                    pathname: "/feed/(tabs)/scanhistory/analyzing",
                    params: { id: String(watchId) },
                  });
                } catch (e: any) {
                  console.warn("direct S3 flow failed:", e?.message || e);
                  setSubmitting(false);
                }
              });
            }}
            style={{
              width: "100%",
              backgroundColor: "#6DB287",
              borderRadius: scale(28),
              height: PILL_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {submitting ? (
              <DotsEllipsis
                running
                dotSize={12}
                gap={6}
                color="#FFFFFF"
                duration={900}
              />
            ) : (
              <>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: Font.inter.extraBold,
                    fontSize: scale(22),
                  }}
                >
                  Continue
                </Text>
                <Image
                  source={require("@/../assets/images/chevron-left.webp")}
                  style={{
                    position: "absolute",
                    right: scale(22),
                    width: scale(30),
                    height: scale(30),
                    tintColor: "#FFFFFF",
                    transform: [{ rotate: "180deg" }],
                  }}
                />
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" }, // ← was missing
  bracketArea: { position: "absolute" },
  corner: {
    position: "absolute",
    borderColor: "#FFFFFF",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    zIndex: 10, // keep it on top
  },
  backIcon: {
    width: 40,
    height: 40,
    tintColor: "#ffffffff",
  },
});
