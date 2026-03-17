import { useState, useCallback, useMemo } from "react";
import { EnrichedTrack } from "./types";
import { MOCK_TRACKS } from "./mock-data";
import { Clean } from "./themes/clean";
import { Asot2K3 } from "./themes/asot-2k3";
import { Kinetik3D } from "./themes/kinetik-3d";
import { Sideways } from "./themes/sideways";
import { Glitched } from "./themes/glitched";

type FieldType = "color" | "boolean" | "number" | "string" | "range";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
}

const THEME_FIELDS: Record<string, FieldDef[]> = {
  clean: [
    { key: "showArtwork", label: "Show Artwork", type: "boolean", defaultValue: true },
    { key: "alignRight", label: "Align Right", type: "boolean", defaultValue: false },
    { key: "animateUp", label: "Animate Up", type: "boolean", defaultValue: false },
    { key: "lineColor", label: "Line Color", type: "color", defaultValue: "#ff0000" },
    { key: "textColor", label: "Text Color", type: "color", defaultValue: "#ffffff" },
    { key: "textStrokeColor", label: "Stroke Color", type: "color", defaultValue: "#000000" },
    { key: "textStrokeWidth", label: "Stroke Width", type: "number", defaultValue: 2, min: 0, max: 10 },
    { key: "fontFamily", label: "Font Family", type: "string", defaultValue: "Rubik, system-ui, sans-serif" },
    { key: "fontSize.artist", label: "Artist Size", type: "number", defaultValue: 40, min: 10, max: 120 },
    { key: "fontSize.title", label: "Title Size", type: "number", defaultValue: 50, min: 10, max: 120 },
    { key: "fontSize.label", label: "Label Size", type: "number", defaultValue: 30, min: 10, max: 120 },
  ],
  "asot-2k3": [
    { key: "lineColor", label: "Line Color", type: "color", defaultValue: "#ffffff" },
    { key: "fontFamily", label: "Font Family", type: "string", defaultValue: "Helvetica Neue" },
    { key: "fontSize.header", label: "Header Size", type: "number", defaultValue: 40, min: 10, max: 120 },
    { key: "fontSize.artist", label: "Artist Size", type: "number", defaultValue: 30, min: 10, max: 120 },
    { key: "fontSize.title", label: "Title Size", type: "number", defaultValue: 30, min: 10, max: 120 },
    { key: "fontSize.label", label: "Label Size", type: "number", defaultValue: 24, min: 10, max: 120 },
  ],
  "kinetik-3d": [
    { key: "redColor", label: "Red Layer", type: "color", defaultValue: "#ff0000" },
    { key: "greenColor", label: "Green Layer", type: "color", defaultValue: "#00ff00" },
    { key: "blueColor", label: "Blue Layer", type: "color", defaultValue: "#0000ff" },
    { key: "overlayColor", label: "Overlay", type: "color", defaultValue: "#ffffff" },
    { key: "speed", label: "Speed", type: "range", defaultValue: 1, min: 0, max: 2, step: 0.1 },
    { key: "fontFamily", label: "Font Family", type: "string", defaultValue: "'Mukta Mahee', sans-serif" },
    { key: "fontSize", label: "Title Size", type: "number", defaultValue: 50, min: 10, max: 120 },
    { key: "artistFontSize", label: "Artist Size", type: "number", defaultValue: 40, min: 10, max: 120 },
  ],
  glitched: [
    { key: "accentColor", label: "Accent Color", type: "color", defaultValue: "#aaaaaa" },
    { key: "textColor", label: "Text Color", type: "color", defaultValue: "#ffffff" },
    { key: "fontFamily", label: "Font Family", type: "string", defaultValue: "'VT323', 'Courier New', monospace" },
    { key: "fontSize.title", label: "Title Size", type: "number", defaultValue: 60, min: 10, max: 120 },
    { key: "fontSize.artist", label: "Artist Size", type: "number", defaultValue: 36, min: 10, max: 120 },
    { key: "fontSize.label", label: "Label Size", type: "number", defaultValue: 22, min: 10, max: 120 },
  ],
  sideways: [
    { key: "titleBackgroundColor", label: "Title BG", type: "color", defaultValue: "#ff0000" },
    { key: "artistBackgroundColor", label: "Artist BG", type: "color", defaultValue: "#ffffff" },
    { key: "titleTextColor", label: "Title Text", type: "color", defaultValue: "#ffffff" },
    { key: "artistTextColor", label: "Artist Text", type: "color", defaultValue: "#000000" },
    { key: "labelTextColor", label: "Label Text", type: "color", defaultValue: "#ffffff" },
    { key: "fontFamily", label: "Font Family", type: "string", defaultValue: "'Heebo', sans-serif" },
    { key: "fontSize.title", label: "Title Size", type: "number", defaultValue: 38, min: 10, max: 120 },
    { key: "fontSize.artist", label: "Artist Size", type: "number", defaultValue: 40, min: 10, max: 120 },
    { key: "fontSize.label", label: "Label Size", type: "number", defaultValue: 30, min: 10, max: 120 },
  ],
};

/** Convert flat key-value pairs to nested props (e.g. "fontSize.title" → { fontSize: { title } }) */
function resolveOptions(
  fields: FieldDef[],
  values: Record<string, string | number | boolean>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.key] ?? field.defaultValue;
    if (field.key.includes(".")) {
      const [parent, child] = field.key.split(".");
      if (!result[parent!]) result[parent!] = {};
      (result[parent!] as Record<string, unknown>)[child!] = value;
    } else {
      result[field.key] = value;
    }
  }
  return result;
}

/** Registry of available themes for the selector */
const THEMES = [
  { id: "clean", name: "Clean", Component: Clean },
  { id: "asot-2k3", name: "ASOT 2K3", Component: Asot2K3 },
  { id: "kinetik-3d", name: "Kinetik 3D", Component: Kinetik3D },
  { id: "sideways", name: "Sideways", Component: Sideways },
  { id: "glitched", name: "Glitched", Component: Glitched },
] as const;

function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export default function App() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [track, setTrack] = useState<EnrichedTrack>(MOCK_TRACKS[0]!);
  const [themeId, setThemeId] = useState<string>("clean");
  const [themeOptions, setThemeOptions] = useState<
    Record<string, Record<string, string | number | boolean>>
  >({});

  const selectedTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const ThemeComponent = selectedTheme.Component;
  const fields = THEME_FIELDS[themeId] ?? [];
  const currentOptions = themeOptions[themeId] ?? {};

  const resolvedProps = useMemo(
    () => resolveOptions(fields, currentOptions),
    [fields, currentOptions],
  );

  const handleNextTrack = useCallback(() => {
    const nextIndex = (trackIndex + 1) % MOCK_TRACKS.length;
    setTrackIndex(nextIndex);
    setTrack({
      ...MOCK_TRACKS[nextIndex]!,
      id: `${MOCK_TRACKS[nextIndex]!.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  }, [trackIndex]);

  const setOption = useCallback(
    (key: string, value: string | number | boolean) => {
      setThemeOptions((prev) => ({
        ...prev,
        [themeId]: { ...prev[themeId], [key]: value },
      }));
    },
    [themeId],
  );

  const resetOptions = useCallback(() => {
    setThemeOptions((prev) => ({ ...prev, [themeId]: {} }));
  }, [themeId]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex-shrink-0">
        <h1 className="text-white text-lg font-semibold">
          Now Playing 3 - Theme Playground
        </h1>
      </header>

      {/* Middle: Preview + Sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Preview area */}
        <main
          className="flex-1 flex items-center justify-center"
          style={{
            backgroundColor: "hsl(0 0% 10%)",
            backgroundImage:
              "linear-gradient(45deg, hsl(0 0% 13%) 25%, transparent 25%), linear-gradient(-45deg, hsl(0 0% 13%) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(0 0% 13%) 75%), linear-gradient(-45deg, transparent 75%, hsl(0 0% 13%) 75%)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          }}
        >
          <div className="w-full max-w-[1200px] min-h-[300px] flex items-center pl-8">
            <ThemeComponent track={track} {...(resolvedProps as any)} />
          </div>
        </main>

        {/* Customization sidebar */}
        <aside className="w-[280px] bg-zinc-900 border-l border-zinc-800 flex-shrink-0 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-sm font-semibold">Customize</h2>
              <button
                onClick={resetOptions}
                className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={currentOptions[field.key]}
                  onChange={(v) => setOption(field.key, v)}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleNextTrack}
            className="px-4 py-2 bg-white text-black font-medium rounded hover:bg-zinc-200 transition-colors text-sm"
          >
            Next Track
          </button>

          <div className="flex items-center gap-2">
            <label htmlFor="theme-select" className="text-zinc-400 text-sm">
              Theme:
            </label>
            <select
              id="theme-select"
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-1.5 text-sm"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-zinc-500 text-sm">
            {track.artist} &mdash; {track.title}
          </div>
        </div>
      </footer>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}) {
  const current = value ?? field.defaultValue;

  switch (field.type) {
    case "boolean":
      return (
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-zinc-400 text-xs">{field.label}</span>
          <input
            type="checkbox"
            checked={current as boolean}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-white"
          />
        </label>
      );

    case "color":
      return (
        <div className="flex items-center justify-between gap-2">
          <span className="text-zinc-400 text-xs flex-shrink-0">
            {field.label}
          </span>
          <div className="flex items-center gap-1.5">
            {isValidHex(current as string) && (
              <input
                type="color"
                value={current as string}
                onChange={(e) => onChange(e.target.value)}
                className="w-6 h-6 rounded border border-zinc-700 cursor-pointer bg-transparent p-0"
              />
            )}
            <input
              type="text"
              value={current as string}
              onChange={(e) => onChange(e.target.value)}
              className="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 text-xs w-[100px] font-mono"
            />
          </div>
        </div>
      );

    case "range":
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-xs">{field.label}</span>
            <span className="text-zinc-500 text-xs font-mono">{current}</span>
          </div>
          <input
            type="range"
            value={current as number}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-white"
          />
        </div>
      );

    case "number":
      return (
        <div className="flex items-center justify-between gap-2">
          <span className="text-zinc-400 text-xs flex-shrink-0">
            {field.label}
          </span>
          <input
            type="number"
            value={current as number}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 text-xs w-[70px] font-mono"
          />
        </div>
      );

    case "string":
      return (
        <div className="flex flex-col gap-1">
          <span className="text-zinc-400 text-xs">{field.label}</span>
          <input
            type="text"
            value={current as string}
            onChange={(e) => onChange(e.target.value)}
            className="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
          />
        </div>
      );

    default:
      return null;
  }
}
