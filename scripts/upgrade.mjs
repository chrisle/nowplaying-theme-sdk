#!/usr/bin/env node
/**
 * Upgrade this clone of the theme SDK — run via `npm run upgrade`.
 *
 * The kit is split into two halves and this script only ever touches one of
 * them:
 *
 *   yours   src/themes/**  bundle.config.json     never read, never written
 *   ours    everything in SDK_PATHS below         replaced with the new version
 *
 * That split is what makes upgrades boring: themes are discovered by scanning
 * `src/themes/`, so shipping one never means editing a file we own, so a new
 * SDK release can overwrite our half outright without touching your work.
 * `package.json` is the one shared file — it gets merged (see mergePackageJson)
 * so upstream's scripts and toolchain land while your extra dependencies stay.
 *
 * Usage:
 *   npm run upgrade                  upgrade from the repo you cloned
 *   npm run upgrade -- --dry-run     show what would change, write nothing
 *   npm run upgrade -- --ref v2.0.0  upgrade to a specific tag or branch
 *   npm run upgrade -- --repo <url>  upgrade from a different remote
 *   npm run upgrade -- --force       proceed even with local SDK edits
 */

import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..");

const DEFAULT_REPO = "https://github.com/chrisle/nowplaying-theme-sdk.git";

/**
 * Everything the SDK owns. On upgrade each entry is replaced with upstream's
 * copy; files that upstream deleted are deleted here too. Directories are
 * mirrored, so anything you add inside one of them is removed — keep your work
 * in `src/themes/`.
 *
 * Exported because the upgrade reads this list from the *incoming* version, so
 * a release that adds new SDK files delivers them without you upgrading twice.
 */
export const SDK_PATHS = [
  // Scoped to this one skill folder rather than all of `.claude/`, so any
  // skills or settings you add of your own survive the upgrade.
  ".claude/skills/create-theme",
  ".gitignore",
  "README.md",
  "index.html",
  "postcss.config.js",
  "tailwind.config.js",
  "tsconfig.json",
  "vite.config.ts",
  "vite.bundle.config.ts",
  "public",
  "scripts",
  "src/App.tsx",
  "src/main.tsx",
  "src/index.css",
  "src/types.ts",
  "src/theme.ts",
  "src/events.ts",
  "src/controller-types.ts",
  "src/mix-types.ts",
  "src/discover.ts",
  "src/registry.ts",
  "src/examples-registry.ts",
  "src/mock-data.ts",
  "src/bundle",
  "src/components",
  "src/examples",
];

/** Yours. Never written, and asserted to be outside every SDK path. */
export const USER_PATHS = ["src/themes", "bundle.config.json"];

function log(msg) {
  process.stdout.write(`[upgrade] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[upgrade] error: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    ref: null,
    repo: null,
    dryRun: false,
    force: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--force" || arg === "-f") args.force = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--ref") args.ref = argv[++i];
    else if (arg === "--repo") args.repo = argv[++i];
    else fail(`unknown option ${arg} (try --help)`);
  }
  return args;
}

function usage() {
  process.stdout.write(
    [
      "Upgrade the Now Playing theme SDK in place.",
      "",
      "  npm run upgrade                  upgrade from the repo you cloned",
      "  npm run upgrade -- --dry-run     show what would change, write nothing",
      "  npm run upgrade -- --ref v2.0.0  upgrade to a specific tag or branch",
      "  npm run upgrade -- --repo <url>  upgrade from a different remote",
      "  npm run upgrade -- --force       proceed even with local SDK edits",
      "",
      "Your themes (src/themes/) and bundle.config.json are never touched.",
      "",
    ].join("\n"),
  );
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function isGitRepo() {
  try {
    return git(["rev-parse", "--is-inside-work-tree"]) === "true";
  } catch {
    return false;
  }
}

/** Where to pull from: an `upstream` remote if there is one, else `origin`. */
function resolveRepo(explicit) {
  if (explicit) return explicit;
  for (const remote of ["upstream", "origin"]) {
    try {
      const url = git(["config", "--get", `remote.${remote}.url`]);
      if (url) return url;
    } catch {
      // no such remote — try the next one
    }
  }
  return DEFAULT_REPO;
}

/** Refuse to clobber uncommitted edits to SDK files unless forced. */
function checkWorkingTree(force) {
  if (!isGitRepo()) {
    if (force) return;
    fail(
      "this folder is not a git repository, so local edits to SDK files cannot be recovered.\n" +
        "        Re-run with --force to upgrade anyway (your themes are never touched either way).",
    );
  }
  const dirty = git(["status", "--porcelain", "--", ...SDK_PATHS])
    .split("\n")
    .filter(Boolean);
  if (dirty.length === 0 || force) return;
  fail(
    `you have uncommitted changes to ${dirty.length} SDK file(s):\n` +
      dirty.map((line) => `          ${line}`).join("\n") +
      "\n        Commit or stash them, or re-run with --force to overwrite.",
  );
}

/** A path from the incoming manifest must stay inside the repo, and out of yours. */
function assertSafePath(rel) {
  if (rel.startsWith("/") || rel.split(/[\\/]/).includes("..")) {
    fail(`refusing to sync unsafe path from upstream manifest: ${rel}`);
  }
  for (const userPath of USER_PATHS) {
    const a = rel.replaceAll("\\", "/");
    const b = userPath.replaceAll("\\", "/");
    if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) {
      fail(
        `refusing to sync ${rel}: it overlaps ${userPath}, which belongs to you`,
      );
    }
  }
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(relative(base, full).split(sep).join("/"));
  }
  return out;
}

function sameContent(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;
  return readFileSync(a).equals(readFileSync(b));
}

/**
 * Bring one SDK path in line with upstream.
 * Directories are mirrored; a path upstream dropped is removed here too.
 */
function syncPath(rel, from, plan, dryRun) {
  assertSafePath(rel);
  const src = join(from, rel);
  const dest = join(ROOT, rel);

  if (!existsSync(src)) {
    if (existsSync(dest)) {
      plan.removed.push(rel);
      if (!dryRun) rmSync(dest, { recursive: true, force: true });
    }
    return;
  }

  if (statSync(src).isDirectory()) {
    const incoming = new Set(listFiles(src));
    const existing = existsSync(dest) ? new Set(listFiles(dest)) : new Set();

    for (const file of incoming) {
      const srcFile = join(src, file);
      const destFile = join(dest, file);
      if (sameContent(srcFile, destFile)) continue;
      plan[existing.has(file) ? "updated" : "added"].push(`${rel}/${file}`);
      if (!dryRun) {
        mkdirSync(dirname(destFile), { recursive: true });
        cpSync(srcFile, destFile);
      }
    }
    for (const file of existing) {
      if (incoming.has(file)) continue;
      plan.removed.push(`${rel}/${file}`);
      if (!dryRun) rmSync(join(dest, file), { force: true });
    }
    return;
  }

  if (sameContent(src, dest)) return;
  plan[existsSync(dest) ? "updated" : "added"].push(rel);
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
  }
}

/**
 * package.json is the one file both halves write to: the SDK owns the scripts
 * and toolchain, you may have added dependencies for your themes. Upstream wins
 * on keys it declares; anything only you have is preserved.
 */
function mergePackageJson(from, plan, dryRun) {
  const destPath = join(ROOT, "package.json");
  const mine = JSON.parse(readFileSync(destPath, "utf8"));
  const theirs = JSON.parse(readFileSync(join(from, "package.json"), "utf8"));

  const merged = {
    ...mine,
    ...theirs,
    // Keep the identity you may have given your fork.
    name: mine.name ?? theirs.name,
    scripts: { ...mine.scripts, ...theirs.scripts },
    dependencies: { ...mine.dependencies, ...theirs.dependencies },
    devDependencies: { ...mine.devDependencies, ...theirs.devDependencies },
  };

  const before = JSON.stringify(mine);
  const after = JSON.stringify(merged);
  if (before === after) return false;

  plan.updated.push("package.json (merged)");
  if (!dryRun) {
    writeFileSync(destPath, JSON.stringify(merged, null, 2) + "\n");
  }
  const depsChanged =
    JSON.stringify(mine.dependencies ?? {}) !==
      JSON.stringify(merged.dependencies) ||
    JSON.stringify(mine.devDependencies ?? {}) !==
      JSON.stringify(merged.devDependencies);
  return depsChanged;
}

function readVersion(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version;
  } catch {
    return "unknown";
  }
}

/** Prefer the incoming release's file list so new SDK files arrive too. */
async function incomingPaths(from) {
  const script = join(from, "scripts", "upgrade.mjs");
  if (!existsSync(script)) return SDK_PATHS;
  try {
    const mod = await import(pathToFileURL(script).href);
    if (Array.isArray(mod.SDK_PATHS) && mod.SDK_PATHS.length > 0) {
      return mod.SDK_PATHS;
    }
  } catch (err) {
    log(`Could not read the incoming file list (${err.message}) — using ours.`);
  }
  return SDK_PATHS;
}

function countUserThemes() {
  const dir = join(ROOT, "src", "themes");
  if (!existsSync(dir)) return 0;
  return listFiles(dir).filter((f) => f.endsWith(".tsx")).length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const repo = resolveRepo(args.repo);
  checkWorkingTree(args.force);

  const tmp = mkdtempSync(join(tmpdir(), "np3theme-sdk-"));
  try {
    log(`Fetching ${repo}${args.ref ? ` (${args.ref})` : ""}...`);
    const cloneArgs = ["clone", "--quiet", "--depth", "1"];
    if (args.ref) cloneArgs.push("--branch", args.ref);
    cloneArgs.push(repo, tmp);
    try {
      await execFileAsync("git", cloneArgs, { cwd: ROOT });
    } catch (err) {
      fail(
        `could not fetch ${repo}\n        ${(err.stderr || err.message).trim()}`,
      );
    }

    const fromVersion = readVersion(ROOT);
    const toVersion = readVersion(tmp);
    log(
      fromVersion === toVersion
        ? `Already on ${toVersion} — re-syncing SDK files.`
        : `${fromVersion} -> ${toVersion}`,
    );

    const paths = await incomingPaths(tmp);
    const plan = { added: [], updated: [], removed: [] };
    for (const rel of paths) syncPath(rel, tmp, plan, args.dryRun);
    const depsChanged = mergePackageJson(tmp, plan, args.dryRun);

    const total = plan.added.length + plan.updated.length + plan.removed.length;
    if (total === 0) {
      log("Nothing to do — your SDK files already match upstream.");
    } else {
      for (const [label, files] of [
        ["new", plan.added],
        ["updated", plan.updated],
        ["removed", plan.removed],
      ]) {
        if (files.length === 0) continue;
        log(`${files.length} ${label}:`);
        for (const file of files)
          process.stdout.write(`             ${file}\n`);
      }
    }

    const themes = countUserThemes();
    log(
      `Kept your ${themes} theme file${themes === 1 ? "" : "s"} in src/themes/ and bundle.config.json.`,
    );

    if (args.dryRun) {
      log("Dry run — nothing was written.");
    } else if (total > 0) {
      if (depsChanged) log("Dependencies changed — run `npm install` next.");
      // The next upgrade reads `git status` to protect your edits, and can't
      // tell this upgrade's files from yours until they're committed.
      log(
        `Commit when you're happy: git add -A && git commit -m "chore: upgrade theme SDK to ${toVersion}"`,
      );
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => fail(err.message ?? String(err)));
}
