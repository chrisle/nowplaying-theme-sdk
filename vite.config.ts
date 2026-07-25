import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error — plain JS dev-server plugin, ships without types
import { downloadBundlePlugin } from "./scripts/vite-plugin-download.mjs";

export default defineConfig({
  plugins: [react(), downloadBundlePlugin()],
});
