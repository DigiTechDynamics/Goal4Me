import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests cover the app's pure logic (no React Native runtime needed).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
