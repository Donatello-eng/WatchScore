// src/lib/revenuecat.ts
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

let configured = false;

export async function configureRevenueCat(appUserID?: string) {
  if (configured) {
    if (appUserID) {
      await Purchases.logIn(appUserID);
    }
    return;
  }

  configured = true;

  Purchases.configure({
    apiKey: Platform.select({
      ios: "appl_aIJyuPUClWQcGwormHmxvlHGNFW",
      android: "goog_your_revenuecat_public_android_key",
    })!,
    appUserID,   // <- correct spelling
  });
}