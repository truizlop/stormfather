import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? "/stormfather/" : "/",
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
