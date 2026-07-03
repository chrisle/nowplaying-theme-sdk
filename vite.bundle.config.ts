import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Vite config used by `npm run build:bundle`.
 *
 * Builds the bundle entry as a single JS module so each per-theme HTML can
 * include the same shared script. Outputs to `dist-bundle/` which the bundle
 * script then turns into per-theme HTML files plus `manifest.json`, all
 * archived into the final ZIP.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-bundle",
    emptyOutDir: true,
    // Library mode keeps the JS standalone (no HTML wrapper). The bundle
    // script writes the host HTML files itself.
    lib: {
      entry: resolve(__dirname, "src/bundle/entry.tsx"),
      formats: ["es"],
      fileName: () => "entry.js",
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Single asset file keeps the relative-path math in the host HTML
        // predictable — the script references `entry.js` and `style.css`.
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "style.css" : "assets/[name][extname]",
      },
    },
  },
});
