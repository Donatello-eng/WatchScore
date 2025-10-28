// InfoOverlay.tsx
import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  BackHandler,
  GestureResponderEvent,
} from "react-native";

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
};

export default function InfoOverlay({ visible, title, message, onClose }: Props) {
  // Android back closes
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      {/* Backdrop that closes on tap */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Card; stop propagation so inner taps don't close */}
        <Pressable
          onPress={(e: GestureResponderEvent) => e.stopPropagation()}
          style={styles.card}
        >
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.body}>{message}</Text>

          <Pressable onPress={onClose} style={styles.btn}>
            <Text style={styles.btnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: "#333",
    lineHeight: 20,
  },
  btn: {
    alignSelf: "flex-end",
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
