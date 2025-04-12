import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/test-*", // Test utilities
        "**/*.d.ts", // Type definitions
        "src/main.ts", // CLI entry point
      ],
      reporter: ["text", "html", "json"],
    },
  },
});
