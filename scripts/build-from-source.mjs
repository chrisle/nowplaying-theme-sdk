#!/usr/bin/env node
/**
 * build-from-source — compile an editable source bundle into an uploadable ZIP.
 *
 * This is the server side of the "edit then upload" loop: a user edits the
 * `.tsx` in a source bundle (see `build:source`) and re-uploads it; the app runs
 * THIS to turn that source back into the compiled bundle it serves.
 *
 * It mirrors what `theme-converter-service` already does around a conversion:
 *   1. reset the SDK to an empty theme set,
 *   2. drop the bundle's theme component(s) into `src/themes/` and register them,
 *   3. run `build:bundle` to produce the compiled, uploadable ZIP.
 *
 * SECURITY: only `src/themes/*.tsx` is taken from the (untrusted) source bundle.
 * Everything else in the bundle — SDK references, a stray package.json, config —
 * is IGNORED; the build always uses this checkout's own SDK. A user therefore
 * cannot alter the SDK contract or inject build tooling. (The Vite build still
 * executes the model/user-authored component, so run it under the same
 * container isolation the converter service uses.)
 *
 * Usage:
 *   npm run build:from-source -- <source.zip | dir> [options]
 *   node scripts/build-from-source.mjs <source.zip | dir> [options]
 *
 * Options:
 *   --no-bundle       Reset + register but skip build:bundle
 *   --keep-workspace  Leave the extracted source workspace for inspection
 *   -h, --help        Show this help
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import {
  extractComponentName,
  registerInApp,
  registerInBundleConfig,
  registerInBundleThemes,
} from "./lib/register-theme.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = resolve(__dirname, "..");
const THEMES_DIR = join(SDK_ROOT, "src", "themes");
const BUNDLE_THEMES_FILE = join(SDK_ROOT, "src", "bundle", "themes.ts");
const BUNDLE_CONFIG_FILE = join(SDK_ROOT, "bundle.config.json");
const APP_FILE = join(SDK_ROOT, "src", "App.tsx");

const VALID_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_THEMES = 50;
const MAX_TSX_BYTES = 512 * 1024; // a single theme component is small

const HELP = `build-from-source — compile a source bundle into an uploadable ZIP

Usage:
  npm run build:from-source -- <source.zip | dir> [options]

Options:
  --no-bundle       Reset + register but skip build:bundle
  --keep-workspace  Leave the extracted source workspace for inspection
  -h, --help        Show this help
`;

function fail(msg) {
  process.stderr.write(`[build:from-source] error: ${msg}\n`);
  process.exit(1);
}

function log(msg) {
  process.stdout.write(`[build:from-source] ${msg}\n`);
}

function run(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd: SDK_ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)),
    );
  });
}

/**
 * Load the source bundle's files as an in-memory map { relPath: string }.
 * Accepts a .zip or an already-extracted directory.
 */
async function loadBundle(inputPath) {
  const files = new Map();
  const stat = statSync(inputPath);

  if (stat.isDirectory()) {
    const { readdirSync } = await import("node:fs");
    const walk = (dir, prefix) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, name.name);
        const rel = prefix ? `${prefix}/${name.name}` : name.name;
        if (name.isDirectory()) walk(full, rel);
        else files.set(rel, readFileSync(full));
      }
    };
    walk(inputPath, "");
    return files;
  }

  const zip = await JSZip.loadAsync(await readFile(inputPath));
  for (const [rel, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    files.set(rel, await entry.async("nodebuffer"));
  }
  return files;
}

function parseManifest(files) {
  const raw = files.get("manifest.json");
  if (!raw) fail("source bundle has no manifest.json at its root");
  let manifest;
  try {
    manifest = JSON.parse(raw.toString("utf8"));
  } catch (e) {
    fail(`manifest.json is not valid JSON: ${e.message}`);
  }
  if (!manifest.source) {
    fail(
      'manifest is not a source bundle (missing "source": true). ' +
        "Use a bundle produced by `build:source`.",
    );
  }
  if (!Array.isArray(manifest.themes) || manifest.themes.length === 0) {
    fail("manifest.themes must be a non-empty array");
  }
  if (manifest.themes.length > MAX_THEMES) {
    fail(`manifest.themes may contain at most ${MAX_THEMES} entries`);
  }
  return manifest;
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = { positional: [] };
  for (const a of argv) {
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "--no-bundle") opts.noBundle = true;
    else if (a === "--keep-workspace") opts.keepWorkspace = true;
    else if (a.startsWith("--")) fail(`Unknown option: ${a}`);
    else opts.positional.push(a);
  }
  if (opts.help || opts.positional.length === 0) {
    process.stdout.write(HELP);
    process.exit(opts.help ? 0 : 1);
  }

  const inputPath = resolve(opts.positional[0]);
  if (!existsSync(inputPath)) fail(`Input not found: ${inputPath}`);

  const files = await loadBundle(inputPath);
  const manifest = parseManifest(files);

  // Reset the SDK to an empty theme set so the compiled bundle contains ONLY
  // this source bundle's themes (mirrors the converter service prep).
  log("resetting SDK to an empty theme set…");
  await run("node", [
    join("scripts", "reset-themes.mjs"),
    "--name",
    String(manifest.name ?? "Custom theme"),
  ]);

  await mkdir(THEMES_DIR, { recursive: true });

  // Drop + register each theme. Only the theme .tsx is trusted out of the
  // bundle; the id is validated and the file is written to a path we control.
  for (const theme of manifest.themes) {
    const id = String(theme.id ?? "");
    if (!VALID_ID.test(id)) {
      fail(`invalid theme id ${JSON.stringify(id)} in manifest`);
    }
    const rel = `src/themes/${id}.tsx`;
    const data = files.get(theme.file) ?? files.get(rel);
    if (!data) {
      fail(`source bundle is missing the component for "${id}" (${rel})`);
    }
    if (data.length > MAX_TSX_BYTES) {
      fail(`theme component ${rel} is too large`);
    }

    const code = data.toString("utf8");
    await writeFile(join(THEMES_DIR, `${id}.tsx`), code, "utf8");

    const pascal = extractComponentName(code, id);
    const meta = {
      name: theme.name || pascal,
      description: theme.description || `${pascal} overlay theme`,
      width: Number.isFinite(theme.width) ? theme.width : 1280,
      height: Number.isFinite(theme.height) ? theme.height : 200,
    };
    registerInBundleThemes(BUNDLE_THEMES_FILE, id, pascal);
    registerInBundleConfig(BUNDLE_CONFIG_FILE, id, meta);
    registerInApp(APP_FILE, id, pascal, meta);
    log(`registered ${id} (${pascal})`);
  }

  if (opts.noBundle) {
    log("Done (skipped build:bundle — --no-bundle).");
    return;
  }

  log("building compiled bundle…");
  await run("npm", ["run", "build:bundle"]);
  log("Done. Compiled bundle written to dist-bundle/.");
}

main().catch((err) => fail(err.message ?? String(err)));
