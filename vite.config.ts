import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error — plain JS dev-server plugin, ships without types
import { downloadBundlePlugin } from "./scripts/vite-plugin-download.mjs";

// @ts-expect-error — dev-server plugin is plain JavaScript
import { themePreviewPlugin } from "./scripts/vite-plugin-theme-preview.mjs";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    downloadBundlePlugin(),
    themePreviewPlugin(
      process.env.NP_THEME_DEV_TOKEN ??
        loadEnv(mode, process.cwd(), "").NP_THEME_DEV_TOKEN,
    ),
  ],
}));
