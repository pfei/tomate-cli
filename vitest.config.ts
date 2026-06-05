import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/test-*",
        "**/*.d.ts",
        "src/main.ts",
      ],
      reporter: ["text", "html", "json"],
    },
  },
});
