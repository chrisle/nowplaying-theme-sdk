/**
 * Shared helpers for registering a theme component into the SDK's build
 * surfaces. Used by `build-from-source` (and mirrors the inline logic in
 * `convert-np2`), so a theme dropped into `src/themes/` gets wired into:
 *
 *   - src/bundle/themes.ts   (BUNDLED_THEMES entry — required to ship)
 *   - bundle.config.json     (theme descriptor — required to ship)
 *   - src/App.tsx            (THEMES entry — dev playground preview)
 *
 * Every function is idempotent: registering an already-registered theme is a
 * no-op. Path arguments are explicit so a caller can target any SDK checkout.
 */

import { readFileSync, writeFileSync } from "node:fs";

export function toKebab(s) {
  return s
    .replace(/\.[^.]+$/, "") // strip extension
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function toPascal(kebab) {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
}

/**
 * The component the bundle registry must import is whatever the theme file
 * actually exports — deriving it from the id is fragile (e.g. `asot-2k3` exports
 * `Asot2K3`, not `Asot2k3`). Read the exported name straight from the source,
 * falling back to the id-derived name only if nothing matches.
 */
export function extractComponentName(code, id) {
  const fn = code.match(/export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (fn) return fn[1];
  const cnst = code.match(/export\s+const\s+([A-Za-z_$][\w$]*)\s*[:=]/);
  if (cnst) return cnst[1];
  return toPascal(id);
}

export function registerInBundleThemes(bundleThemesFile, slug, pascal) {
  let src = readFileSync(bundleThemesFile, "utf-8");
  const importLine = `import { ${pascal} } from "../themes/${slug}";`;
  const entryLine = `  "${slug}": ${pascal} as ComponentType<BundledThemeProps>,`;

  if (src.includes(importLine) && src.includes(`"${slug}":`)) {
    return false;
  }

  // Insert the import after the last existing `import { ... } from "../themes/..."`.
  // On a reset (empty) SDK there are no theme imports yet, so fall back to
  // anchoring after the last import of any kind.
  const importRe = /import\s+\{[^}]+\}\s+from\s+"\.\.\/themes\/[^"]+";/g;
  const importMatches = [...src.matchAll(importRe)];
  let insertAt;
  if (importMatches.length > 0) {
    const lastImport = importMatches[importMatches.length - 1];
    insertAt = lastImport.index + lastImport[0].length;
  } else {
    const anyImports = [...src.matchAll(/^import\s.+;$/gm)];
    if (anyImports.length === 0) {
      throw new Error(`Could not find an import anchor in ${bundleThemesFile}`);
    }
    const last = anyImports[anyImports.length - 1];
    insertAt = last.index + last[0].length;
  }
  src = src.slice(0, insertAt) + `\n${importLine}` + src.slice(insertAt);

  // Insert the registry entry as the last property of the BUNDLED_THEMES object.
  const objRe = /export const BUNDLED_THEMES:[^=]*=\s*\{/;
  const objMatch = src.match(objRe);
  if (!objMatch) {
    throw new Error(
      `Could not find BUNDLED_THEMES object in ${bundleThemesFile}`,
    );
  }
  const objStart = objMatch.index + objMatch[0].length;
  const closeIdx = src.indexOf("};", objStart);
  if (closeIdx === -1) {
    throw new Error(
      `Could not find end of BUNDLED_THEMES object in ${bundleThemesFile}`,
    );
  }
  src = src.slice(0, closeIdx) + `${entryLine}\n` + src.slice(closeIdx);

  writeFileSync(bundleThemesFile, src, "utf-8");
  return true;
}

export function registerInBundleConfig(bundleConfigFile, slug, meta) {
  const config = JSON.parse(readFileSync(bundleConfigFile, "utf-8"));
  if (!Array.isArray(config.themes)) config.themes = [];
  const existing = config.themes.find((t) => t.id === slug);
  const entry = {
    id: slug,
    name: meta.name,
    description: meta.description,
    width: meta.width,
    height: meta.height,
  };
  if (existing) {
    Object.assign(existing, entry);
  } else {
    config.themes.push(entry);
  }
  writeFileSync(
    bundleConfigFile,
    JSON.stringify(config, null, 2) + "\n",
    "utf-8",
  );
}

export function registerInApp(appFile, slug, pascal, meta) {
  let src = readFileSync(appFile, "utf-8");
  const importLine = `import { ${pascal} } from "./themes/${slug}";`;

  if (src.includes(importLine)) return false;

  // Insert the import after the last `import { ... } from "./themes/..."`, or
  // after the last import of any kind on a reset (empty) SDK.
  const importRe = /import\s+\{[^}]+\}\s+from\s+"\.\/themes\/[^"]+";/g;
  const importMatches = [...src.matchAll(importRe)];
  if (importMatches.length > 0) {
    const lastImport = importMatches[importMatches.length - 1];
    const insertAt = lastImport.index + lastImport[0].length;
    src = src.slice(0, insertAt) + `\n${importLine}` + src.slice(insertAt);
  } else {
    const anyImports = [...src.matchAll(/^import\s.+;$/gm)];
    if (anyImports.length > 0) {
      const last = anyImports[anyImports.length - 1];
      const insertAt = last.index + last[0].length;
      src = src.slice(0, insertAt) + `\n${importLine}` + src.slice(insertAt);
    }
  }

  // Insert into the THEMES registry array, before its closing `] as const;`.
  const themesRe = /const THEMES = \[[\s\S]*?\n(\] as const;)/;
  const themesMatch = src.match(themesRe);
  if (themesMatch) {
    const entryLine = `  { id: "${slug}", name: ${JSON.stringify(meta.name)}, Component: ${pascal} },\n`;
    const closeToken = themesMatch[1];
    const closeIdx = src.indexOf(closeToken, themesMatch.index);
    src = src.slice(0, closeIdx) + entryLine + src.slice(closeIdx);
  }

  writeFileSync(appFile, src, "utf-8");
  return true;
}
