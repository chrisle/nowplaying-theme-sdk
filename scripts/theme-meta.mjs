/**
 * Reads every theme's `meta` export out of `src/themes/` so the bundle build
 * can write `manifest.json` without a separate list of themes to keep in sync.
 *
 * Themes are TSX, so they can't be imported by Node directly. They are bundled
 * with esbuild first, with every bare import (react, motion, ...) and every
 * stylesheet replaced by an inert stub: `meta` is a plain object literal, so
 * none of those need to actually run — and stubbing them keeps a theme that
 * touches the DOM at module scope from breaking the build.
 *
 * Only `src/themes/` is scanned. `src/examples/` is the kit's own worked
 * example, which is why nothing in it can end up in a `.np3theme`.
 */

import { build } from "esbuild";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/** Any import that isn't a relative file: React, motion, CSS, everything. */
const stubPlugin = {
  name: "stub-externals",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /.*/ }, (args) => {
      const bare = !args.path.startsWith(".") && !args.path.startsWith("/");
      const style = args.path.endsWith(".css");
      if (args.kind === "entry-point" || (!bare && !style)) return null;
      return { path: args.path, namespace: "stub" };
    });
    pluginBuild.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      // CommonJS so esbuild reads named imports as property lookups, which the
      // proxy answers for any name the theme happens to import.
      contents: `
        const stub = new Proxy(function () {}, {
          get: (_t, prop) =>
            typeof prop === "symbol" || prop === "__esModule" ? undefined : stub,
          apply: () => stub,
          construct: () => stub,
        });
        module.exports = stub;
      `,
      loader: "js",
    }));
  },
};

/** Theme sources: `src/themes/<name>.tsx` and `src/themes/<name>/index.tsx`. */
async function findThemeFiles(themesDir) {
  if (!existsSync(themesDir)) return [];
  const entries = await readdir(themesDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(join(themesDir, entry.name));
    } else if (entry.isDirectory()) {
      const index = join(themesDir, entry.name, "index.tsx");
      if (existsSync(index)) files.push(index);
    }
  }
  return files;
}

function validate(meta, source, seen) {
  if (!meta || typeof meta !== "object") {
    throw new Error(
      `${source} has no \`meta\` export — every theme must export \`const meta: ThemeMeta\``,
    );
  }
  if (typeof meta.id !== "string" || !ID_PATTERN.test(meta.id)) {
    throw new Error(
      `${source}: meta.id ${JSON.stringify(meta.id)} must be lowercase alphanumeric with - or _ (max 64 chars)`,
    );
  }
  if (typeof meta.name !== "string" || meta.name.length === 0) {
    throw new Error(`${source}: meta.name is required`);
  }
  const duplicate = seen.get(meta.id);
  if (duplicate) {
    throw new Error(
      `${source}: duplicate theme id "${meta.id}" — already declared in ${duplicate}`,
    );
  }
  seen.set(meta.id, source);
}

/**
 * @param {string} root Repository root (the folder holding `src/`).
 * @returns {Promise<Array<{ id: string, name: string, description?: string,
 *   width?: number, height?: number, source: string }>>}
 */
export async function readThemeMetas(root) {
  const files = await findThemeFiles(join(root, "src", "themes"));
  if (files.length === 0) return [];

  const entry = files
    .map((file, i) => `import * as m${i} from ${JSON.stringify(file)};`)
    .join("\n");
  const exports = `export const modules = [${files
    .map((file, i) => `{ source: ${JSON.stringify(file)}, mod: m${i} }`)
    .join(", ")}];`;

  const bundled = await build({
    stdin: {
      contents: `${entry}\n${exports}\n`,
      resolveDir: root,
      loader: "ts",
      sourcefile: "theme-meta-entry.ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    logLevel: "silent",
    plugins: [stubPlugin],
  });

  const tmp = await mkdtemp(join(tmpdir(), "np3theme-meta-"));
  const outFile = join(tmp, "themes.mjs");
  try {
    await writeFile(outFile, bundled.outputFiles[0].text, "utf8");
    const { modules } = await import(pathToFileURL(outFile).href);

    const seen = new Map();
    return modules.map(({ source, mod }) => {
      const relative = source.slice(root.length + 1);
      validate(mod.meta, relative, seen);
      if (!mod.default && Object.keys(mod).length <= 1) {
        throw new Error(
          `${relative}: no theme component exported — add \`export default\``,
        );
      }
      const { id, name, description, width, height } = mod.meta;
      return { id, name, description, width, height, source: relative };
    });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
