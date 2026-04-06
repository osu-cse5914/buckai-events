import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { View } from "react-native";

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  return <Redirect href={isSignedIn ? "/featured" : "/sign-in"} />;
}
