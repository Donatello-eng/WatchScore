// app/feed/(tabs)/scanhistory/_layout.tsx
import { Stack } from "expo-router";

export default function ScanHistoryLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right", // default for this stack
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen
        name="uploadphotos"
        // index -> uploadphotos still feels like a normal push
        options={{
          animation: "slide_from_left",
        }}
      />

      <Stack.Screen
        name="camera"
        // feels like staying in the same flow, no side-slide
        options={{
          animation: "fade", // or "fade"
        }}
      />

      <Stack.Screen
        name="analyzing"
        options={{
          animation: "none", // or "fade"
        }}
      />

      <Stack.Screen
        name="watch-details"
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="support"
        // can feel like a modal from bottom if you want
        options={{
          presentation: "modal",
          animation: "slide_from_bottom", // or "fade_from_bottom"
        }}
      />
    </Stack>
  );
}