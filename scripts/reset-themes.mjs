#!/usr/bin/env node
/**
 * reset-themes — strip the SDK down to an empty theme set.
 *
 * The theme-converter pipeline needs a clean slate so a `build:bundle` produces
 * a bundle containing ONLY the just-converted theme (not the shipped starter
 * themes). This empties every place a theme is registered and deletes the theme
 * components, while leaving the structural anchors intact so `convert-np2` can
 * register a fresh theme afterwards:
 *
 *   - src/themes/*.tsx            → deleted
 *   - src/bundle/themes.ts        → BUNDLED_THEMES = {}
 *   - bundle.config.json          → { name, themes: [] }
 *   - src/App.tsx                 → ./themes imports removed; THEME_FIELDS = {};
 *                                   THEMES = [] (dev playground only)
 *
 * Idempotent: safe to run on an already-reset SDK.
 *
 * Usage:
 *   node scripts/reset-themes.mjs                    (or: npm run reset-themes)
 *   node scripts/reset-themes.mjs --name "My Themes" (also set the bundle name)
 */

import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const THEMES_DIR = join(ROOT, "src", "themes");
const BUNDLE_THEMES_FILE = join(ROOT, "src", "bundle", "themes.ts");
const BUNDLE_CONFIG_FILE = join(ROOT, "bundle.config.json");
const APP_FILE = join(ROOT, "src", "App.tsx");

function log(msg) {
  process.stdout.write(`[reset-themes] ${msg}\n`);
}

// 1. Delete every theme component.
let removed = 0;
for (const name of readdirSync(THEMES_DIR)) {
  if (name.endsWith(".tsx")) {
    rmSync(join(THEMES_DIR, name));
    removed++;
  }
}
log(`removed ${removed} theme file(s) from src/themes/`);

// 2. Empty the bundle theme registry (keep the type + exports intact).
writeFileSync(
  BUNDLE_THEMES_FILE,
  `import type { ComponentType } from "react";
import type { EnrichedTrack } from "../types";

/**
 * Theme registry used by the bundle build.
 *
 * Each entry maps a theme id (declared in \`bundle.config.json\`) to the React
 * component that renders it inside the bundled iframe overlay. Populated by
 * \`convert-np2\`; emptied by \`reset-themes\`.
 */

export interface BundledThemeProps {
  track: EnrichedTrack | null;
  [key: string]: unknown;
}

export const BUNDLED_THEMES: Record<string, ComponentType<BundledThemeProps>> =
  {};
`,
  "utf-8",
);
log("emptied src/bundle/themes.ts");

// 3. Empty the bundle config. `--name` renames the bundle (the converter uses
//    this so a user's bundle isn't labelled "Now Playing Starter Themes").
const argv = process.argv.slice(2);
const nameIdx = argv.indexOf("--name");
const bundleName = nameIdx !== -1 ? argv[nameIdx + 1] : undefined;

const config = JSON.parse(readFileSync(BUNDLE_CONFIG_FILE, "utf-8"));
config.themes = [];
if (bundleName) config.name = bundleName;
writeFileSync(
  BUNDLE_CONFIG_FILE,
  JSON.stringify(config, null, 2) + "\n",
  "utf-8",
);
log(
  bundleName
    ? `emptied bundle.config.json themes[] (bundle name: ${bundleName})`
    : "emptied bundle.config.json themes[]",
);

// 4. Reset the dev playground registrations in App.tsx.
let app = readFileSync(APP_FILE, "utf-8");
app = app.replace(/^import\s+\{[^}]+\}\s+from\s+"\.\/themes\/[^"]+";\n/gm, "");
app = app.replace(
  /const THEME_FIELDS: Record<string, FieldDef\[\]> = \{[\s\S]*?\n\};/,
  "const THEME_FIELDS: Record<string, FieldDef[]> = {};",
);
app = app.replace(
  /const THEMES = \[[\s\S]*?\n\] as const;/,
  "const THEMES = [\n] as const;",
);
writeFileSync(APP_FILE, app, "utf-8");
log("reset src/App.tsx registrations");

log("done — SDK is at an empty theme set");
