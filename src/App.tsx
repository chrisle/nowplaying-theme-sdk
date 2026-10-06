import { EventInputs, useThemeInputs } from "./components/event-inputs";
import { useState, useCallback, useMemo } from "react";
import { DownloadBundleButton } from "./components/download-bundle-button";
import { EnrichedTrack } from "./types";
import { MOCK_TRACKS } from "./mock-data";
import { USER_THEMES } from "./registry";
import { EXAMPLE_THEMES } from "./examples-registry";
import { resolveFieldValues } from "./discover";
import type { Theme, ThemeField } from "./theme";

/**
 * Theme playground.
 *
 * Themes are discovered, not registered: everything in `src/themes/` (yours)
 * and `src/examples/` (the kit's) shows up in the picker automatically, and
 * the sidebar controls come from each theme's own `meta.fields`. That means
 * adding a theme never requires editing this file — which is what keeps
 * `npm run upgrade` from ever conflicting with your work.
 */

const ALL_THEMES: Theme[] = [...USER_THEMES, ...EXAMPLE_THEMES];
const DEFAULT_THEME = USER_THEMES[0] ?? EXAMPLE_THEMES[0];

function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export default function App() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [track, setTrack] = useState<EnrichedTrack>(MOCK_TRACKS[0]!);
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME?.meta.id ?? "");
  const [themeOptions, setThemeOptions] = useState<
    Record<string, Record<string, string | number | boolean>>
  >({});

  const selectedTheme =
    ALL_THEMES.find((t) => t.meta.id === themeId) ?? DEFAULT_THEME;
  const inputs = useThemeInputs(track, selectedTheme?.meta.events);
  const fields = selectedTheme?.meta.fields ?? [];
  const currentOptions = themeOptions[themeId] ?? {};

  const resolvedProps = useMemo(
    () => resolveFieldValues(fields, currentOptions),
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
            {selectedTheme ? (
              <selectedTheme.Component
                {...(resolvedProps as Record<string, unknown>)}
                {...inputs.props}
              />
            ) : (
              <p className="text-zinc-500 text-sm">
                No themes found. Copy src/examples/clean.tsx into src/themes/ to
                get started.
              </p>
            )}
          </div>
        </main>

        {/* Customization sidebar */}
        <aside className="w-[280px] bg-zinc-900 border-l border-zinc-800 flex-shrink-0 overflow-y-auto">
          <EventInputs inputs={inputs} />
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

            {fields.length === 0 && (
              <p className="text-zinc-500 text-xs">
                This theme declares no editable fields. Add a `fields` array to
                its `meta` to get controls here.
              </p>
            )}

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
              {USER_THEMES.length > 0 && (
                <optgroup label="Your themes">
                  {USER_THEMES.map((t) => (
                    <option key={t.meta.id} value={t.meta.id}>
                      {t.meta.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {EXAMPLE_THEMES.length > 0 && (
                <optgroup label="Examples (not packaged)">
                  {EXAMPLE_THEMES.map((t) => (
                    <option key={t.meta.id} value={t.meta.id}>
                      {t.meta.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <DownloadBundleButton />

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
  field: ThemeField;
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
