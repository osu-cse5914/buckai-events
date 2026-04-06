import { Platform, View } from "react-native";

export function HeaderUserButton() {
  if (Platform.OS === "web") {
    const { UserButton } = require("@clerk/expo/web") as typeof import("@clerk/expo/web");

    return (
      <div style={{ marginRight: 6 }}>
        <UserButton />
      </div>
    );
  }

  const { UserButton } = require("@clerk/expo/native") as typeof import("@clerk/expo/native");

  return (
    <View style={{ marginRight: 6 }}>
      <UserButton />
    </View>
  );
}
