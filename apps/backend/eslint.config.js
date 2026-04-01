import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".wrangler", "worker-configuration.d.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.es2022
      }
    }
  },
  {
    files: ["src/index.ts", "src/lib/types.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  }
);
