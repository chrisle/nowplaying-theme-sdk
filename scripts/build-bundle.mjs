#!/usr/bin/env node
/**
 * Build a Now Playing theme bundle — run via `npm run build`.
 *
 * The output is a ZIP archive carrying the `.np3theme` extension, which is what
 * the Now Playing dashboard's Custom Themes upload expects.
 *
 * 1. Discovers your themes by scanning `src/themes/` and reading each theme's
 *    own `meta` export (`bundle.config.json` only names the bundle). The kit's
 *    worked examples live in `src/examples/` and are never packaged.
 * 2. Runs Vite with `vite.bundle.config.ts` to produce a single shared JS+CSS
 *    pair in `dist-bundle/`.
 * 3. Lays out the bundle in `dist-bundle/staging/`:
 *      manifest.json
 *      shared/entry.js
 *      shared/style.css
 *      themes/<id>/index.html       (one per theme, sets <meta name="np-theme">)
 * 4. Zips the staging directory into `dist-bundle/<slug>.np3theme`.
 *
 * The output ZIP is what users upload via the Custom Themes panel on
 * https://app.nowplayingapp.com.
 *
 * `buildBundle()` is also exported so the dev server's "Download .np3theme"
 * button can run the exact same build (see scripts/vite-plugin-download.mjs).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import JSZip from "jszip";
import { readFile, readdir, stat } from "node:fs/promises";
import { readThemeMetas } from "./theme-meta.mjs";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const CONFIG_PATH = join(ROOT, "bundle.config.json");
const VITE_CONFIG = join(ROOT, "vite.bundle.config.ts");
const DIST_DIR = join(ROOT, "dist-bundle");
const STAGING_DIR = join(DIST_DIR, "staging");

function log(msg) {
  process.stdout.write(`[build] ${msg}\n`);
}

/** `bundle.config.json` carries the bundle's name — nothing else. */
function readConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Missing ${CONFIG_PATH}`);
  }
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    throw new Error('bundle.config.json must declare a "name" for the bundle');
  }
  if (raw.themes) {
    log(
      'Note: bundle.config.json no longer declares themes — each theme\'s "meta" export in src/themes/ is the source of truth. You can delete the "themes" key.',
    );
  }
  return raw;
}

/** Your themes, straight from `src/themes/` — never `src/examples/`. */
async function readThemes() {
  const themes = await readThemeMetas(ROOT);
  if (themes.length === 0) {
    throw new Error(
      "No themes found in src/themes/ — copy src/examples/clean.tsx there and give it your own meta.id",
    );
  }
  log(
    `Found ${themes.length} theme${themes.length === 1 ? "" : "s"}: ${themes.map((t) => t.id).join(", ")}`,
  );
  return themes;
}

async function runVite() {
  log("Running vite build (bundle config)...");
  // We invoke the CLI rather than the programmatic API so the resolved
  // config matches exactly what `npx vite build` would produce. Async so the
  // dev server stays responsive while the bundle builds.
  await execFileAsync("npx", ["vite", "build", "--config", VITE_CONFIG], {
    cwd: ROOT,
    maxBuffer: 16 * 1024 * 1024,
    // Pin production explicitly. Vite reads NODE_ENV to decide, and a build
    // started from the dev server (the download button) would otherwise
    // inherit `development` and compile JSX against React's dev runtime —
    // which the bundle, built for production React, cannot call.
    env: { ...process.env, NODE_ENV: "production" },
  });
}

function htmlForTheme(theme, bundleName) {
  const title = `${bundleName} — ${theme.name}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="np-theme" content="${escapeAttr(theme.id)}" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="../../shared/style.css" />
    <style>
      /* A transparent background alone is not enough: the theme runs in an
         iframe on the overlay page, and Chrome paints that frame's canvas with
         the base colour of the used colour scheme — WHITE under the default
         light scheme. Declaring the dark scheme keeps the canvas transparent so
         the theme composites over the video in OBS. */
      html { color-scheme: dark; }
      html, body { margin: 0; padding: 0; background: transparent; }
      #root { width: 100vw; min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="../../shared/entry.js"></script>
  </body>
</html>
`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}

function escapeAttr(s) {
  return escapeHtml(s);
}

function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "themes"
  );
}

async function buildStaging(config, themes) {
  log("Laying out bundle in staging/...");
  rmSync(STAGING_DIR, { recursive: true, force: true });
  mkdirSync(STAGING_DIR, { recursive: true });
  mkdirSync(join(STAGING_DIR, "shared"), { recursive: true });

  const entryJs = join(DIST_DIR, "entry.js");
  const styleCss = join(DIST_DIR, "style.css");
  if (!existsSync(entryJs)) {
    throw new Error(
      `Expected ${entryJs} after vite build — bundle config may be misconfigured`,
    );
  }
  cpSync(entryJs, join(STAGING_DIR, "shared/entry.js"));
  if (existsSync(styleCss)) {
    cpSync(styleCss, join(STAGING_DIR, "shared/style.css"));
  } else {
    // Some theme combinations may produce no CSS — write an empty stylesheet
    // so the per-theme HTML's <link> never 404s.
    writeFileSync(join(STAGING_DIR, "shared/style.css"), "");
  }

  const manifestThemes = [];
  for (const theme of themes) {
    const dir = join(STAGING_DIR, "themes", theme.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "index.html"),
      htmlForTheme(theme, config.name ?? "Custom themes"),
    );
    manifestThemes.push({
      id: theme.id,
      name: theme.name,
      entry: `themes/${theme.id}/index.html`,
      description: theme.description,
      width: theme.width,
      height: theme.height,
      events: theme.events,
    });
  }

  const manifest = {
    version: 1,
    name: config.name ?? "Custom themes",
    themes: manifestThemes,
  };
  writeFileSync(
    join(STAGING_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  return { manifest };
}

async function zipStaging(config) {
  const fileName = `${slugify(config.name ?? "themes")}.np3theme`;
  const outPath = join(DIST_DIR, fileName);
  log(`Packaging bundle to ${outPath}...`);

  const zip = new JSZip();

  async function walk(dir, prefix) {
    const items = await readdir(dir);
    for (const name of items) {
      const full = join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      const s = await stat(full);
      if (s.isDirectory()) {
        await walk(full, rel);
      } else {
        zip.file(rel, await readFile(full));
      }
    }
  }
  await walk(STAGING_DIR, "");

  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  writeFileSync(outPath, buf);
  return { outPath, fileName };
}

/**
 * Build the `.np3theme` bundle and return where it landed.
 *
 * @returns {Promise<{ outPath: string, fileName: string, manifest: object }>}
 */
export async function buildBundle() {
  const config = readConfig();
  const themes = await readThemes();
  await runVite();
  const { manifest } = await buildStaging(config, themes);
  const { outPath, fileName } = await zipStaging(config);
  log(
    `Done. ${manifest.themes.length} theme${manifest.themes.length === 1 ? "" : "s"} packaged.`,
  );
  return { outPath, fileName, manifest };
}

async function main() {
  const { outPath } = await buildBundle();
  log(
    `Upload ${outPath} on https://app.nowplayingapp.com/dashboard/overlays/configure.`,
  );
}

// Only run the CLI when invoked directly (`node scripts/build-bundle.mjs`) —
// importing this module (the dev-server download button) must not build.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    process.stderr.write(`[build] error: ${err.message ?? err}\n`);
    process.exit(1);
  });
}
