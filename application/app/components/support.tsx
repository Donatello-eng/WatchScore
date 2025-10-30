import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  Image,
} from "react-native";
import { useR } from "../../hooks/useR";
import { LinearGradient } from "expo-linear-gradient";
import { triggerHaptic } from "../../hooks/haptics";

// Replace with your actual UI theme colors
const UI = {
  stroke: "rgba(255,255,255,0.66)",
  glass: "rgba(255, 255, 255, 0.5)",
  text: "#525252",
};

const DEFAULT_BG = ["#1e2b2f", "#F5E3DA"];

export default function SupportScreen() {
  const router = useRouter();
  const { scale, vw, vh } = useR();

  const safeTop = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

  const handleEmailPress = () => {
    Linking.openURL("mailto:bumpgamespublic@gmail.com");
  };

  const handleWebsitePress = () => {
    Linking.openURL("https://bump.games");
  };

  // Responsive values via useR()
  const iconSize = scale(30);
  const backPos = { top: safeTop + scale(12), left: scale(16) };
  const containerPad = { paddingHorizontal: vw(7), paddingVertical: vh(3) };
  const titleSizing = { fontSize: scale(24), marginBottom: scale(40) };
  const buttonSizing = {
    paddingVertical: scale(18),
    borderRadius: scale(26),
    borderWidth: scale(2),
    marginBottom: scale(20),
  };
  const buttonTextSizing = { fontSize: scale(18), letterSpacing: 0.3 };
  const footerTextSizing = { fontSize: scale(22), letterSpacing: 0.5 };

  return (
    <View style={[styles.root, { paddingTop: safeTop }]}>
      {/* background gradient */}
      <LinearGradient
        colors={["#FFFFFF", "#F3DCDD", "#E1C7E6"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Back chevron */}
      <Pressable
        hitSlop={12}
        onPress={() => {
          triggerHaptic("impactMedium");
          router.back();
        }}
        style={styles.backBtn}
      >
        <Image
          source={require("../../assets/images/chevron-left.webp")}
          style={styles.backIcon}
        />
      </Pressable>

      <View style={[styles.container, containerPad]}>
        <View style={styles.middleContent}>
          <Text style={[styles.title, titleSizing]} allowFontScaling={false}>
            Need help? Contact us!
          </Text>

          <TouchableOpacity
            style={[styles.button, buttonSizing]}
            onPress={() => {
              triggerHaptic("impactMedium");
              handleEmailPress();
            }}
          >
            <Text
              style={[styles.buttonText, buttonTextSizing]}
              allowFontScaling={false}
            >
              Email Support
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, buttonSizing]}
            onPress={() => {
              triggerHaptic("impactMedium");
              handleWebsitePress();
            }}
          >
            <Text
              style={[styles.buttonText, buttonTextSizing]}
              allowFontScaling={false}
            >
              Visit Our Website
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer at the bottom */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              footerTextSizing,
              { paddingBottom: vh(2) },
            ]}
            allowFontScaling={false}
          >
            WatchScore
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  back: {
    position: "absolute",
    zIndex: 10,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  middleContent: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontWeight: "700",
    color: UI.text,
    textAlign: "center",
  },
  button: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.glass,
    borderColor: UI.stroke,
  },
  buttonText: {
    color: UI.text,
    fontFamily: "Inter_700Bold",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    color: UI.text,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    opacity: 1,
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
