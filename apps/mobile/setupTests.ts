import { cleanup } from "@testing-library/react-native";

process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3001";
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_mobile";

afterEach(() => {
  cleanup();
});
