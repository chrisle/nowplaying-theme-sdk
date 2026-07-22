/**
 * Unit tests for the theme-registration helpers. Run with `npm test`
 * (Node's built-in test runner). These cover the fragile string/regex logic
 * that `build-from-source` and `convert-np2` depend on to wire a theme into the
 * bundle build surfaces — no SDK mutation, all fixtures are temp files.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  toKebab,
  toPascal,
  extractComponentName,
  registerInBundleThemes,
  registerInBundleConfig,
  registerInApp,
} from "./register-theme.mjs";

test("toKebab / toPascal round-trip common ids", () => {
  assert.equal(toKebab("MyCoolTheme"), "my-cool-theme");
  assert.equal(toKebab("neon glow.html"), "neon-glow");
  assert.equal(toPascal("now-playing-cust1"), "NowPlayingCust1");
  assert.equal(toPascal("clean"), "Clean");
});

test("extractComponentName reads the real export, not the id-derived guess", () => {
  // The regression that motivated this: id-derived casing (Asot2k3) is wrong.
  assert.equal(
    extractComponentName("export function Asot2K3(props) {}", "asot-2k3"),
    "Asot2K3",
  );
  assert.equal(
    extractComponentName("export const Kinetik3D = () => null", "kinetik-3d"),
    "Kinetik3D",
  );
  // Falls back to the id-derived name when nothing is exported.
  assert.equal(
    extractComponentName("// no export here", "my-theme"),
    "MyTheme",
  );
  // The inner `function XTheme(` (not exported) must not be picked over the
  // exported outer component.
  const two = "function FooTheme(p){}\nexport function Foo(){ return null }";
  assert.equal(extractComponentName(two, "foo"), "Foo");
});

test("registerInBundleThemes inserts import + entry, idempotently", () => {
  const dir = mkdtempSync(join(tmpdir(), "reg-test-"));
  try {
    const file = join(dir, "themes.ts");
    writeFileSync(
      file,
      `import type { ComponentType } from "react";
import type { EnrichedTrack } from "../types";

export interface BundledThemeProps { track: EnrichedTrack | null; }

export const BUNDLED_THEMES: Record<string, ComponentType<BundledThemeProps>> =
  {};
`,
    );
    assert.equal(registerInBundleThemes(file, "neon", "Neon"), true);
    let out = readFileSync(file, "utf8");
    assert.match(out, /import \{ Neon \} from "\.\.\/themes\/neon";/);
    assert.match(out, /"neon": Neon as ComponentType<BundledThemeProps>,/);
    // Second call is a no-op (already registered).
    assert.equal(registerInBundleThemes(file, "neon", "Neon"), false);
    const out2 = readFileSync(file, "utf8");
    assert.equal(out2, out);
    // A second, different theme appends without clobbering the first.
    registerInBundleThemes(file, "retro", "Retro");
    out = readFileSync(file, "utf8");
    assert.match(out, /"neon":/);
    assert.match(out, /"retro":/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("registerInBundleConfig adds then updates by id", () => {
  const dir = mkdtempSync(join(tmpdir(), "reg-test-"));
  try {
    const file = join(dir, "bundle.config.json");
    writeFileSync(file, JSON.stringify({ name: "X", themes: [] }, null, 2));
    registerInBundleConfig(file, "neon", {
      name: "Neon",
      description: "d",
      width: 800,
      height: 200,
    });
    let cfg = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(cfg.themes.length, 1);
    assert.deepEqual(cfg.themes[0], {
      id: "neon",
      name: "Neon",
      description: "d",
      width: 800,
      height: 200,
    });
    // Same id updates in place (no duplicate).
    registerInBundleConfig(file, "neon", {
      name: "Neon 2",
      description: "d2",
      width: 900,
      height: 300,
    });
    cfg = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(cfg.themes.length, 1);
    assert.equal(cfg.themes[0].name, "Neon 2");
    assert.equal(cfg.themes[0].width, 900);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("registerInApp inserts import + THEMES entry, idempotently", () => {
  const dir = mkdtempSync(join(tmpdir(), "reg-test-"));
  try {
    const file = join(dir, "App.tsx");
    writeFileSync(
      file,
      `import { useState } from "react";

const THEME_FIELDS: Record<string, FieldDef[]> = {};

const THEMES = [
] as const;

export default function App() { return null; }
`,
    );
    assert.equal(registerInApp(file, "neon", "Neon", { name: "Neon" }), true);
    const out = readFileSync(file, "utf8");
    assert.match(out, /import \{ Neon \} from "\.\/themes\/neon";/);
    assert.match(out, /\{ id: "neon", name: "Neon", Component: Neon \},/);
    // Idempotent.
    assert.equal(registerInApp(file, "neon", "Neon", { name: "Neon" }), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
