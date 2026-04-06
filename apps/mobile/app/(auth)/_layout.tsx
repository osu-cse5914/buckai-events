import { Stack, Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { View } from "react-native";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  if (isSignedIn) {
    return <Redirect href="/featured" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
