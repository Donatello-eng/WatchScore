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
import { useR } from "../../../hooks/useR";
import { Font } from "../../../hooks/fonts";
import { router } from "expo-router";

export default function UploadPhotos() {
  const insets = useSafeAreaInsets();
  const { scale, vw, vh } = useR();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={["#FFFFFF", "#FCF6EC", "#F4DDE0", "#E1C7E6"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView
        style={styles.safe}
        edges={["top", "left", "right", "bottom"]}
      >
        {/* Back chevron */}
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

        {/* Big title */}
        <View style={{ paddingHorizontal: vw(20), marginTop: vh(1) }}>
          <Text
            style={{
              fontFamily: Font.inter.bold,
              fontSize: scale(44),
              lineHeight: scale(52),
              color: "#0E0E0E",
            }}
          >
            {"Please,\nupload 3\npictures of\nthe watch"}
          </Text>
        </View>

        {/* Collage zone */}
        <View>
          {/* Front */}
          <View
            style={[
              styles.cardWrap,
              { width: vw(43), height: vw(43), left: vw(15), top: vh(5) },
            ]}
          >
            <Image
              source={require("../../assets/images/front.webp")}
              style={{
                width: "100%",
                height: "100%",
                transform: [{ rotate: "-2deg" }],
              }}
              resizeMode="contain"
            />
          </View>

          {/* Caseback */}
          <View
            style={[
              styles.cardWrap,
              { width: vw(43), height: vw(43), right: vw(6), top: vh(16) },
            ]}
          >
            <Image
              source={require("../../assets/images/caseback.webp")}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="contain"
            />
          </View>

          {/* Side */}
          <View
            style={[
              styles.cardWrap,
              { width: vw(54), height: vw(54), right: vw(33), top: vh(24) },
            ]}
          >
            <Image
              source={require("../../assets/images/side.webp")}
              style={{
                width: "100%",
                height: "100%",
                transform: [{ rotate: "-11.45deg" }],
              }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Begin button */}

        <Pressable
          onPress={() => router.push("/feed/camera")}
          style={({ pressed }) => [
            styles.beginBtn,
            pressed && { transform: [{ scale: 0.98 }] },
            {
              bottom: insets.bottom + vh(3),
              borderRadius: scale(40),
              paddingVertical: scale(16),
              paddingHorizontal: vw(14),
            },
          ]}
        >
          <Text
            style={{
              fontFamily: Font.inter.bold,
              fontSize: scale(22),
              color: "#FFFFFF",
            }}
          >
            Begin
          </Text>

          {/* Chevron pinned to the right, text stays centered */}
          <Image
            source={require("../../assets/images/chevron-left.webp")}
            style={{
              position: "absolute",
              right: scale(18),
              width: scale(20),
              height: scale(20),
              tintColor: "#FFFFFF",
              transform: [{ rotate: "180deg" }],
            }}
            resizeMode="contain"
          />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  cardWrap: {
    position: "absolute",
  },

  beginBtn: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
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
    tintColor: "#3A3A3A",
  },
});
