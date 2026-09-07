import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? "/stormfather/" : "/",
  test: {
    // Avoid dozens of jsdom/geometry workers competing for memory.
    maxWorkers: 4,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
