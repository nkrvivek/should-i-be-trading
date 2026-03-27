import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    css: false,
  },
});
