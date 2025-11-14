// app/feed/_layout.tsx
import { Tabs } from "expo-router";

export default function FeedLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // hide default tab bar
      }}
    >
      <Tabs.Screen name="uploadphotos" />
      <Tabs.Screen name="scanhistory" />
    </Tabs>
  );
}
