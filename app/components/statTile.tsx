import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useR } from "../../hooks/useR";
import { Font } from "../../hooks/fonts";

export type StatTileProps = {
  value: string; // main value (e.g., "~120")
  unit?: string; // e.g., "g" or "kg"
  unitStyle?: TextStyle; // override for unit styling
  label: string;
  icon: any; // require(…)
  style?: ViewStyle;
  valueSize?: number; // font size for the main value only
};

export default function StatTile({
  value,
  unit,
  unitStyle,
  label,
  icon,
  style,
  valueSize = 20,
}: StatTileProps) {
  const { scale } = useR();

  return (
    <View style={[styles(scale).tile, style]}>
      <Text
        style={[styles(scale).tileValue, { fontSize: valueSize }]}
        numberOfLines={2}
      >
        {value}
        {!!unit && (
          <Text
            // default unit styling + any overrides you pass
            style={[styles(scale).tileUnit, unitStyle]}
          >
            {" "}
            {unit}
          </Text>
        )}
      </Text>

      <View style={styles(scale).tileLabelRow}>
        <Image
          source={icon}
          style={styles(scale).tileIcon}
          resizeMode="contain"
        />
        <Text style={styles(scale).tileLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = (scale: (n: number) => number) =>
  StyleSheet.create({
    tile: {
      backgroundColor: "#F5F5F5",
      borderRadius: scale(16),
      paddingVertical: scale(12),
      paddingHorizontal: scale(14),
      minHeight: scale(86),
      justifyContent: "space-between",
    },
    tileValue: {
      color: "#45494A",
      fontFamily: Font.inter.bold,
    },
    // default unit styling (smaller + muted)
    tileUnit: {
      color: "#8F8F8F",
      fontFamily: Font.inter.medium,
      fontSize: scale(12),
    },
    tileLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: scale(8),
    },
    tileIcon: {
      width: scale(16),
      height: scale(16),
      tintColor: "#9B9B9B",
      marginRight: scale(6),
    },
    tileLabel: {
      color: "#9B9B9B",
      fontFamily: Font.inter.medium,
      fontSize: scale(12),
    },
  });
