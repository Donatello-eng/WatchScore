// app/camera.tsx (adjust path if needed)
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  StyleSheet as RNStyleSheet,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { scale, vw, vh } = useR();
  const camRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  // three slots; null = empty (show gallery icon)
  const [slots, setSlots] = useState<Array<string | null>>([null, null, null]);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontFamily: Font.inter.medium, marginBottom: 12 }}>
          Camera permission required
        </Text>

        <Pressable
          onPress={async () => {
            try {
              const res = await requestPermission();
              // res: { granted: boolean; canAskAgain: boolean; status: PermissionStatus; ... }
              if (
                !res?.granted &&
                res &&
                "canAskAgain" in res &&
                !res.canAskAgain
              ) {
                // User selected "Don’t ask again" previously → open Settings
                await Linking.openSettings();
              }
            } catch (e) {
              console.warn("requestPermission error", e);
            }
          }}
          style={{ padding: 12 }}
        >
          <Text style={{ color: "#2E39FF", fontFamily: Font.inter.semiBold }}>
            Grant
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    try {
      const res: any = await camRef.current?.takePictureAsync({
        quality: 0.9,
        skipProcessing: true,
      });
      const uri: string | undefined = res?.uri;
      if (!uri) return;

      setSlots((prev) => {
        const i = prev.findIndex((s) => s === null);
        if (i === -1) return prev;
        const next = [...prev];
        next[i] = uri;
        return next;
      });
    } catch (e) {
      console.warn("takePicture error", e);
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
  const allFull = slots.every(Boolean);

  const pickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        await Linking.openSettings();
        return;
      }

      // ✅ Compat: prefer new API, fallback to old one
      const mediaImages =
        // new enum (SDK 51+)
        (ImagePicker as any).MediaType?.Images ??
        // fallback to deprecated enum
        ImagePicker.MediaTypeOptions.Images;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaImages,
        allowsEditing: false,
        quality: 0.9,
        selectionLimit: 1,
      });

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      setSlots((prev) => {
        const i = prev.findIndex((s) => s === null);
        if (i === -1) {
          const next = [...prev];
          next[next.length - 1] = uri;
          return next;
        }
        const next = [...prev];
        next[i] = uri;
        return next;
      });
    } catch (e) {
      console.warn("pickFromGallery error", e);
    }
  };

  // create a unique session id
  const makeSessionId = () => `${Date.now()}`;

  // ensure a uri is a file we own; copy into app doc dir under the session folder
  async function copyIntoSession(uri: string, sessionDir: string, idx: number) {
    // ensure dir exists
    await FileSystem.makeDirectoryAsync(sessionDir, {
      intermediates: true,
    }).catch(() => {});
    const ext = uri.split(".").pop() || "jpg";
    const dest = `${sessionDir}/photo_${idx + 1}.${ext}`;
    try {
      // If it's already a file:// we can copy directly. If it's content:// (Android gallery), copyAsync still works.
      await FileSystem.copyAsync({ from: uri, to: dest });
      return dest;
    } catch {
      // Fallback: try to download (covers some content:// providers)
      const dl = await FileSystem.downloadAsync(uri, dest);
      return dl.uri;
    }
  }

  // persist current 3 slots -> returns sessionId
  async function persistCurrentSlots(): Promise<string | null> {
    const filled = slots.filter(Boolean) as string[];
    if (filled.length === 0) return null;

    const sessionId = `${Date.now()}`;

    // resolve lazily & safely
    const FS: any = FileSystem as any;
    const baseDir: string | null =
      FS?.documentDirectory ?? FS?.cacheDirectory ?? null;

    // default: just keep the original URIs (works even if baseDir is unavailable)
    let images: string[] = slots.map((u) => u ?? "");

    if (baseDir) {
      const dir = `${baseDir}sessions/${sessionId}`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(
        () => {}
      );

      const out: string[] = Array(3).fill("");

      for (let i = 0; i < 3; i++) {
        const uri = slots[i];
        if (!uri) continue;

        const ext = (uri.split(".").pop() || "jpg").split("?")[0];
        const dest = `${dir}/photo_${i + 1}.${ext}`;

        try {
          await FileSystem.copyAsync({ from: uri, to: dest });
          out[i] = dest;
        } catch {
          // Some content:// URIs require a download fallback
          const dl = await FileSystem.downloadAsync(uri, dest).catch(
            () => null
          );
          out[i] = dl?.uri ?? uri; // still keep original if download fails
        }
      }

      images = out;
    }

    const manifest = { id: sessionId, createdAt: Date.now(), images };
    await AsyncStorage.setItem(
      `session:${sessionId}`,
      JSON.stringify(manifest)
    );
    return sessionId;
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={camRef}
        style={RNStyleSheet.absoluteFill}
        facing="back"
      />
      {/* Back chevron */}
      <SafeAreaView style={RNStyleSheet.absoluteFill} pointerEvents="box-none">
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={styles.backIcon}
          />
        </Pressable>
      </SafeAreaView>
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
      {/* Thumbnails row (exactly 3 slots) */}
      {/* Bottom cluster: thumbnails ABOVE pill, both move together */}
      <View
        style={{
          position: "absolute",
          left: vw(7),
          right: vw(7),
          bottom: insets.bottom + vh(2), // anchor once
          alignItems: "center",
        }}
      >
        {/* Thumbnails (centered) */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: scale(14),
            marginBottom: vh(2), // <= constant gap to the pill
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
                  />
                ) : (
                  <Image
                    source={require("../../assets/images/gallery.webp")}
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
                  onPress={() => removeSlot(idx)}
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
        {!allFull ? (
          <View
            style={{
              width: "100%",
              backgroundColor: "rgba(31,31,31,0.4)",
              borderRadius: scale(28),
              paddingVertical: scale(10),
              alignItems: "center",
            }}
          >
            {/* left: Gallery */}
            <Pressable
              onPress={pickFromGallery}
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
                source={require("../../assets/images/gallery.webp")}
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

            {/* center: shutter AS AN IMAGE */}
            <Pressable onPress={takePhoto}>
              <Image
                source={require("../../assets/images/shutter.webp")}
                style={{ width: scale(74), height: scale(74) }}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        ) : (
          // Solid green "Continue" pill
          <Pressable
            onPress={async () => {
              const id = await persistCurrentSlots();
              if (id) {
                router.push({
                  pathname: "/feed/watch-details",
                  params: { sessionId: id },
                });
              }
            }}
            style={{
              width: "100%",
              backgroundColor: "#6DB287", // green
              borderRadius: scale(28),
              paddingVertical: scale(28),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
              source={require("../../assets/images/chevron-left.webp")}
              style={{
                position: "absolute",
                right: scale(22),
                width: scale(30),
                height: scale(30),
                tintColor: "#FFFFFF",
                transform: [{ rotate: "180deg" }],
              }}
              //resizeMode="contain"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bracketArea: { position: "absolute" },
  corner: {
    position: "absolute",
    borderColor: "#FFFFFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    marginTop: 15,
    marginLeft: 20,
  },
  backIcon: {
    width: 40,
    height: 40,
    tintColor: "#ffffffff",
  },
});
