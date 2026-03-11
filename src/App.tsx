import { useState, useCallback } from "react";
import { EnrichedTrack } from "./types";
import { MOCK_TRACKS } from "./mock-data";
import { Clean } from "./themes/clean";

/** Registry of available themes for the selector */
const THEMES = [
  { id: "clean", name: "Clean", Component: Clean },
] as const;

export default function App() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [track, setTrack] = useState<EnrichedTrack>(MOCK_TRACKS[0]!);
  const [themeId, setThemeId] = useState<string>("clean");

  const selectedTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const ThemeComponent = selectedTheme.Component;

  const handleNextTrack = useCallback(() => {
    const nextIndex = (trackIndex + 1) % MOCK_TRACKS.length;
    setTrackIndex(nextIndex);
    // Create a new track object with a unique ID to trigger animation
    setTrack({
      ...MOCK_TRACKS[nextIndex]!,
      id: `${MOCK_TRACKS[nextIndex]!.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  }, [trackIndex]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <h1 className="text-white text-lg font-semibold">
          Now Playing Theme SDK
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Build and preview overlay themes for Now Playing
        </p>
      </header>

      {/* Preview area with checkered background */}
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
        <div className="w-full max-w-[1200px] min-h-[300px] flex items-center">
          <ThemeComponent track={track} />
        </div>
      </main>

      {/* Controls panel */}
      <footer className="bg-zinc-900 border-t border-zinc-800 px-6 py-4">
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
