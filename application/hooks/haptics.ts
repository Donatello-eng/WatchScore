// haptics.ts
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type HapticType =
  | "selection"
  | "impactLight"
  | "impactMedium"
  | "impactHeavy"
  | "notificationSuccess"
  | "notificationError"
  | keyof typeof Haptics.AndroidHaptics;

/**
 * Trigger haptic feedback safely on both iOS and Android using Expo Haptics
 * Works in Expo Go without prebuild
 */
export const triggerHaptic = async (type: HapticType) => {
  if (Platform.OS === "android") {
    // Use Android-specific haptics if available
    if (type in Haptics.AndroidHaptics) {
      await Haptics.performAndroidHapticsAsync(
        Haptics.AndroidHaptics[type as keyof typeof Haptics.AndroidHaptics]
      );
      return;
    }

    // Map common iOS types to Android equivalents
    switch (type) {
      case "impactLight":
        await Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Confirm
        );
        break;
      case "impactMedium":
        await Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Long_Press
        );
        break;
      case "impactHeavy":
        await Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Long_Press
        );
        break;
      case "notificationSuccess":
        await Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Confirm
        );
        break;
      case "notificationError":
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject);
        break;
      case "selection":
      default:
        await Haptics.performAndroidHapticsAsync(
          Haptics.AndroidHaptics.Confirm
        );
        break;
    }
  } else {
    // iOS
    switch (type) {
      case "impactLight":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "impactMedium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "impactHeavy":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "notificationSuccess":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        break;
      case "notificationError":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case "selection":
      default:
        await Haptics.selectionAsync();
    }
  }
};
