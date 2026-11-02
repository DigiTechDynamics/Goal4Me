import { defineConfig } from "vitest/config";

// Unit tests cover the kit's pure logic (no React Native runtime needed).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
