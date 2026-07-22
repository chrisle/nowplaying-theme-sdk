#!/usr/bin/env node
/**
 * build-source — package a theme as an EDITABLE source bundle.
 *
 * Unlike `build:bundle` (which compiles themes into a runtime JS blob to upload
 * and serve), this emits the theme's TypeScript SOURCE so a user can open it,
 * edit the component, and re-upload. The app compiles the source server-side on
 * upload (see `build:from-source`), so the source bundle never needs to ship a
 * build toolchain — only the theme source plus read-only SDK references so the
 * relative imports resolve in an editor.
 *
 * Reads `bundle.config.json` for the themes to package. Output:
 *
 *   <slug>-source.zip
 *   ├── manifest.json                     ("source": true + theme descriptors)
 *   ├── README.md
 *   ├── src/themes/<id>.tsx               (editable — one per configured theme)
 *   ├── src/components/base-overlay.tsx   (read-only reference)
 *   ├── src/components/album-art.tsx      (read-only reference)
 *   └── src/types.ts                      (read-only reference)
 *
 * Usage:
 *   npm run build:source
 *   node scripts/build-source.mjs [--out <dir>]
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(ROOT, "bundle.config.json");
const THEMES_DIR = join(ROOT, "src", "themes");
const DIST_DIR = join(ROOT, "dist-bundle");

// Read-only SDK files bundled so the theme's relative imports resolve when the
// user opens the source in an editor. The server rebuild ignores these and uses
// its own pinned copies — a user cannot alter the SDK contract this way.
export const SOURCE_REFERENCE_FILES = [
  "src/components/base-overlay.tsx",
  "src/components/album-art.tsx",
  "src/types.ts",
];

/** The manifest marker that tells the app "this bundle is source, build it". */
export const SOURCE_MANIFEST_VERSION = 1;

function log(msg) {
  process.stdout.write(`[build:source] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[build:source] error: ${msg}\n`);
  process.exit(1);
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

function readConfig() {
  if (!existsSync(CONFIG_PATH)) fail(`Missing ${CONFIG_PATH}`);
  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  if (!Array.isArray(raw.themes) || raw.themes.length === 0) {
    fail("bundle.config.json must declare a non-empty themes array");
  }
  return raw;
}

function readmeFor(config) {
  const first = config.themes[0];
  return `# ${config.name ?? "Custom theme"} — editable source

This is the **source** for your Now Playing overlay theme. Edit the component
under \`src/themes/\`, then re-upload this folder (zipped) as a custom theme —
the app compiles it for you on upload.

## What's here

- \`src/themes/${first.id}.tsx\` — your theme component. Edit this.
- \`src/components/\`, \`src/types.ts\` — read-only SDK references so the imports
  in your theme resolve in an editor. Changes to these are ignored on upload;
  the server always builds against its own copy of the SDK.
- \`manifest.json\` — describes the theme(s). Keep the \`id\`/\`file\` fields intact.

## Editing

Your theme is a React component built on the SDK's \`BaseOverlay\` /
\`ThemeRenderProps\` contract. Change the layout, colours, fonts, and animations;
keep the exported component name and its \`BaseOverlay\` wrapper. You don't need
\`npm install\` — the app builds the theme when you upload.

## Re-uploading

Zip the contents of this folder (so \`manifest.json\` is at the zip root) and
upload it on the Custom Themes panel. The app rebuilds and serves it.
`;
}

async function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf("--out");
  const outDir = outIdx !== -1 ? argv[outIdx + 1] : DIST_DIR;

  const config = readConfig();

  const zip = new JSZip();
  const manifestThemes = [];

  for (const theme of config.themes) {
    if (!theme.id) fail("every theme in bundle.config.json needs an id");
    const themeFile = join(THEMES_DIR, `${theme.id}.tsx`);
    if (!existsSync(themeFile)) {
      fail(`theme source not found: src/themes/${theme.id}.tsx`);
    }
    const rel = `src/themes/${theme.id}.tsx`;
    zip.file(rel, await readFile(themeFile, "utf8"));
    manifestThemes.push({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      width: theme.width,
      height: theme.height,
      file: rel,
    });
    log(`packaged ${rel}`);
  }

  // Read-only SDK references (best-effort — skip any the SDK doesn't have).
  for (const ref of SOURCE_REFERENCE_FILES) {
    const abs = join(ROOT, ref);
    if (existsSync(abs)) {
      zip.file(ref, await readFile(abs, "utf8"));
    }
  }

  const manifest = {
    version: SOURCE_MANIFEST_VERSION,
    name: config.name ?? "Custom theme",
    source: true,
    themes: manifestThemes,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  zip.file("README.md", readmeFor(config));

  const slug = slugify(config.name ?? "themes");
  const outPath = join(outDir, `${slug}-source.zip`);
  mkdirSync(outDir, { recursive: true });
  const buf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  writeFileSync(outPath, buf);
  log(
    `Done. ${manifestThemes.length} theme${manifestThemes.length === 1 ? "" : "s"} packaged as source.`,
  );
  log(`Wrote ${outPath}`);
}

main().catch((err) => fail(err.message ?? String(err)));
