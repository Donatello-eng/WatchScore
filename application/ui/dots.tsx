import React from "react";
import { StyleSheet, View } from "react-native";

// put this near the top of the file or in src/ui/Dots.tsx
export function Dots({
  active,
  total = 4,
}: {
  active: number;
  total?: number;
}) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active - 1 ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: { backgroundColor: "#1D1D1D" },
  dotInactive: { backgroundColor: "#D6D6D6" },
});
