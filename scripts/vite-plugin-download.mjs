/**
 * Dev-server plugin backing the playground's "Download .np3theme" button.
 *
 * The bundle build is a Node job (vite build + zip), so the browser cannot do
 * it alone. This plugin exposes a dev-only endpoint that runs the very same
 * `buildBundle()` used by `npm run build` and streams the resulting archive
 * back as a file download.
 *
 *   GET /__np3theme/download  ->  200 application/zip   (the .np3theme)
 *                             ->  500 application/json  ({ error })
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const DOWNLOAD_ENDPOINT = "/__np3theme/download";

export function downloadBundlePlugin() {
  let building = false;

  return {
    name: "np3theme-download",
    apply: "serve",
    config() {
      return {
        // Building from the playground drops a full bundle in dist-bundle/.
        // Keep the dev server out of it: its HTML would otherwise be crawled
        // as an app entry (dependency scan fails on the built JS) and every
        // build would trigger a reload storm.
        optimizeDeps: { entries: ["index.html"] },
        server: {
          watch: { ignored: ["**/dist-bundle/**", "**/dist/**"] },
        },
      };
    },
    configureServer(server) {
      // Imported at request time, by absolute path: Vite bundles this config
      // into a temp file, so a static import would both inline the build
      // script (breaking the paths it derives from its own location) and trip
      // esbuild on its shebang.
      const buildScript = pathToFileURL(
        join(server.config.root, "scripts/build-bundle.mjs"),
      ).href;

      server.middlewares.use(DOWNLOAD_ENDPOINT, async (_req, res) => {
        // One build at a time — concurrent builds share dist-bundle/ and would
        // clobber each other's staging directory.
        if (building) {
          res.statusCode = 409;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "A bundle build is already running" }),
          );
          return;
        }
        building = true;
        try {
          const { buildBundle } = await import(buildScript);
          const { outPath, fileName } = await buildBundle();
          const data = await readFile(outPath);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/zip");
          res.setHeader("Content-Length", String(data.byteLength));
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`,
          );
          res.end(data);
        } catch (err) {
          const message = err?.stderr || err?.message || String(err);
          server.config.logger.error(`[np3theme] build failed: ${message}`);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        } finally {
          building = false;
        }
      });
    },
  };
}
