import type { Theme, ThemeComponent, ThemeMeta } from "./theme";

/**
 * Turns the modules a `import.meta.glob` returns into a theme registry.
 *
 * Kept deliberately forgiving: a half-finished theme file logs a warning and is
 * skipped rather than blanking the playground. The `.np3theme` build validates
 * the same metadata strictly (see `scripts/theme-meta.mjs`) so a broken theme
 * can never be packaged.
 */

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

type ThemeModule = Record<string, unknown>;

function warn(source: string, message: string): void {
  console.warn(`[themes] ${source}: ${message}`);
}

/** The component is the default export, or the sole other function export. */
function pickComponent(mod: ThemeModule): ThemeComponent | null {
  if (typeof mod.default === "function") {
    return mod.default as ThemeComponent;
  }
  const candidates = Object.entries(mod).filter(
    ([key, value]) => key !== "meta" && typeof value === "function",
  );
  if (candidates.length === 1) {
    return candidates[0]![1] as ThemeComponent;
  }
  return null;
}

export function buildRegistry(modules: Record<string, unknown>): Theme[] {
  const themes: Theme[] = [];
  const seen = new Map<string, string>();

  for (const [source, loaded] of Object.entries(modules).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const mod = loaded as ThemeModule;
    const meta = mod?.meta as ThemeMeta | undefined;

    if (!meta || typeof meta !== "object") {
      warn(source, "no `meta` export — skipping");
      continue;
    }
    if (typeof meta.id !== "string" || !ID_PATTERN.test(meta.id)) {
      warn(
        source,
        `meta.id ${JSON.stringify(meta.id)} must be lowercase alphanumeric with - or _ (max 64 chars) — skipping`,
      );
      continue;
    }
    if (typeof meta.name !== "string" || meta.name.length === 0) {
      warn(source, "meta.name is required — skipping");
      continue;
    }
    if (
      meta.events !== undefined &&
      (!Array.isArray(meta.events) ||
        meta.events.some(
          (event) => !["track", "mix", "controller"].includes(event),
        ) ||
        new Set(meta.events).size !== meta.events.length)
    ) {
      warn(
        source,
        "meta.events must list unique supported events: track, mix, controller — skipping",
      );
      continue;
    }
    const duplicate = seen.get(meta.id);
    if (duplicate) {
      warn(source, `duplicate theme id "${meta.id}" (already in ${duplicate})`);
      continue;
    }

    const Component = pickComponent(mod);
    if (!Component) {
      warn(source, "no theme component exported — add `export default`");
      continue;
    }

    seen.set(meta.id, source);
    themes.push({ meta, Component, source });
  }

  return themes;
}

/** Flat playground values → props, expanding dotted keys into nested objects. */
export function resolveFieldValues(
  fields: ThemeMeta["fields"],
  values: Record<string, string | number | boolean>,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const field of fields ?? []) {
    const value = values[field.key] ?? field.defaultValue;
    if (field.key.includes(".")) {
      const [parent, child] = field.key.split(".");
      if (!props[parent!]) props[parent!] = {};
      (props[parent!] as Record<string, unknown>)[child!] = value;
    } else {
      props[field.key] = value;
    }
  }
  return props;
}
