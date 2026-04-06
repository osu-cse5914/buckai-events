import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { View } from "react-native";
import { palette } from "@/lib/theme";

export default function ProtectedAppLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#fffaf4",
        },
        headerTintColor: palette.text,
        headerTitleStyle: {
          fontWeight: "700",
        },
        contentStyle: {
          backgroundColor: palette.background,
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="events/[eventId]"
        options={{ title: "Event Detail" }}
      />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
    </Stack>
  );
}
