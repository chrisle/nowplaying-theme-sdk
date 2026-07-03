#!/usr/bin/env node
/**
 * Build a Now Playing theme bundle.
 *
 * 1. Reads `bundle.config.json` to learn which themes to ship.
 * 2. Runs Vite with `vite.bundle.config.ts` to produce a single shared JS+CSS
 *    pair in `dist-bundle/`.
 * 3. Lays out the bundle in `dist-bundle/staging/`:
 *      manifest.json
 *      shared/entry.js
 *      shared/style.css
 *      themes/<id>/index.html       (one per theme, sets <meta name="np-theme">)
 * 4. Zips the staging directory into `dist-bundle/<slug>.zip`.
 *
 * The output ZIP is what users upload via the Custom Themes panel on
 * https://app.nowplayingapp.com.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { readFile, readdir, stat } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const CONFIG_PATH = join(ROOT, "bundle.config.json");
const VITE_CONFIG = join(ROOT, "vite.bundle.config.ts");
const DIST_DIR = join(ROOT, "dist-bundle");
const STAGING_DIR = join(DIST_DIR, "staging");

function log(msg) {
  process.stdout.write(`[build:bundle] ${msg}\n`);
}

function readConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Missing ${CONFIG_PATH}`);
  }
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  if (!Array.isArray(raw.themes) || raw.themes.length === 0) {
    throw new Error("bundle.config.json must declare a non-empty themes array");
  }
  for (const t of raw.themes) {
    if (!t.id || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(t.id)) {
      throw new Error(
        `Invalid theme id ${JSON.stringify(t.id)} — must be lowercase alphanumeric with - or _ (max 64 chars)`,
      );
    }
    if (!t.name) {
      throw new Error(`Theme ${t.id} is missing a name`);
    }
  }
  return raw;
}

function runVite() {
  log("Running vite build (bundle config)...");
  // We invoke the CLI rather than the programmatic API so the resolved
  // tsconfig + jsx settings exactly match what `npm run build` would do.
  execFileSync("npx", ["vite", "build", "--config", VITE_CONFIG], {
    stdio: "inherit",
    cwd: ROOT,
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

async function buildStaging(config) {
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
  for (const theme of config.themes) {
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
  const slug = slugify(config.name ?? "themes");
  const outPath = join(DIST_DIR, `${slug}.zip`);
  log(`Zipping bundle to ${outPath}...`);

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
  return outPath;
}

async function main() {
  const config = readConfig();
  runVite();
  const { manifest } = await buildStaging(config);
  const outPath = await zipStaging(config);
  log(
    `Done. ${manifest.themes.length} theme${manifest.themes.length === 1 ? "" : "s"} packaged.`,
  );
  log(`Upload ${outPath} on https://app.nowplayingapp.com/dashboard/overlays/configure.`);
}

main().catch((err) => {
  process.stderr.write(`[build:bundle] error: ${err.message ?? err}\n`);
  process.exit(1);
});
