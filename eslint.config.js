// Flat ESLint config shared by every workspace package.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**", "**/.turbo/**", "**/.expo/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Force explicit `import type` so type-only imports vanish from bundles.
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
    },
  },
);
