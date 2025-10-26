// src/screens/ScanHistory.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";
import { router } from "expo-router";

export default function ScanHistory() {
  const insets = useSafeAreaInsets();
  const { scale, vw, vh } = useR();
  const [active, setActive] = React.useState<"camera" | "collection">(
    "collection"
  );

  // NEW: shared sizes so header title and image align cleanly
  const supportIconSize = scale(28);
  const headerSideWidth = supportIconSize; // left spacer matches icon width

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* background gradient */}
      <LinearGradient
        colors={["#FFFFFF", "#F3F1F1", "#F3DCDD", "#E1C7E6"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Only left/right edges; we control top/bottom padding explicitly to avoid first-frame jump */}
      <SafeAreaView
        style={[
          styles.safe,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
        edges={["left", "right"]}
      >
        {/* === HEADER ROW (title centered, support image aligned on the right) === */}
        <View
          style={[
            styles.header,
            { marginTop: scale(20), paddingHorizontal: vw(5) },
          ]}
        >
          {/* Left spacer keeps title perfectly centered */}
          <View style={{ width: headerSideWidth }} />

          <Text
            style={[
              styles.title,
              { fontSize: scale(32), fontFamily: Font.inter.extraBold },
            ]}
            numberOfLines={1}
          >
            Scan History
          </Text>

          {/* Right image button */}
          <Pressable
            onPress={() => router.push("/components/support")}
            hitSlop={scale(8)}
            style={styles.supportBtn}
          >
            <Image
              source={require("../../assets/images/info.webp")}
              style={{ width: supportIconSize, height: supportIconSize, tintColor: "#525252" }}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        {/* Illustration area (hands are images) */}
        <View
          style={[styles.illustration, { height: vh(52) }]}
          pointerEvents="none"
        >
          {/* Left hand */}
          <Image
            source={require("../../assets/images/lefthand.webp")}
            style={[
              styles.leftHand,
              {
                width: vw(45),
                height: vw(45),
                bottom: vh(13),
                left: -vw(0),
              },
            ]}
          />

          {/* Right hand (includes phone inside the picture) */}
          <Image
            source={require("../../assets/images/righthand.webp")}
            resizeMode="contain"
            style={[
              styles.rightHand,
              {
                width: vw(90),
                height: vw(90),
                bottom: vh(0),
                right: -vw(22),
              },
            ]}
          />
        </View>

        {/* Empty state text */}
        <Text
          style={[
            styles.ooops,
            {
              fontSize: scale(16),
              marginTop: vh(0),
            },
          ]}
        >
          {"Ooops…\nThere are no scanned watches"}
        </Text>
      </SafeAreaView>

      {/* Bottom pill navigation (floats above bottom inset) */}
      <View
        style={[
          styles.navPill,
          {
            bottom: insets.bottom + scale(12),
          },
        ]}
      >
        {/* Camera */}
        <Pressable
          onPress={() => {
            setActive("camera");
            router.push("/feed/uploadphotos");
          }}
          style={[styles.navItem, active === "camera" && styles.navItemActive]}
          hitSlop={8}
        >
          <Image
            source={require("../../assets/images/camera.webp")}
            style={{ width: 26, height: 26 }}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.navItemLabel,
              active === "camera" && styles.navItemLabelActive,
            ]}
          >
            Camera
          </Text>
        </Pressable>

        {/* Collection */}
        <Pressable
          onPress={() => setActive("collection")}
          style={[
            styles.navItem,
            { paddingHorizontal: 15 },
            active === "collection" && styles.navItemActive,
          ]}
          hitSlop={8}
        >
          <Image
            source={require("../../assets/images/grid.webp")}
            style={{ width: 26, height: 26 }}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.navItemLabel,
              active === "collection" && styles.navItemLabelActive,
              { fontFamily: Font.inter.semiBold, fontSize: 11 },
            ]}
          >
            Collection
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  safe: {
    flex: 1,
    alignItems: "center",
    // paddingTop/paddingBottom are injected via insets so the first frame is correct
  },

  // NEW: header row with centered title
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // spacer | title | button
  },

  // support button now participates in the row layout (no absolute positioning)
  supportBtn: {
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: "#525252",
    letterSpacing: 0.3,
    // marginTop removed; header handles spacing
    textAlign: "center",
    flexShrink: 1, // avoid overflow on small screens
  },

  illustration: {
    width: "100%",
    justifyContent: "flex-end",
  },

  leftHand: { position: "absolute" },
  rightHand: { position: "absolute" },

  ooops: {
    color: "#686868",
    fontFamily: Font.inter.semiBold,
    textAlign: "center",
    alignSelf: "center",
  },

  navPill: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.5)",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 100,
  },

  navItem: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 26,
    gap: 0,
  },

  navItemActive: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 100,
  },

  navItemLabel: {
    color: "#2B2B2B",
    textAlign: "center",
    fontFamily: Font.inter.semiBold,
    fontSize: 11,
  },

  navItemLabelActive: {
    color: "#4456A6",
  },
});
