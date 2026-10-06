import type { ThemeMeta, ThemeProps } from "../theme";
import { TransportControls } from "../components/transport-controls";
import { AlbumArt } from "../components/album-art";
import { ControllerMixer } from "../components/mixer";

export const meta: ThemeMeta = {
  id: "reactive-mixer",
  name: "MIDI Playground",
  width: 640,
  height: 610,
  description:
    "Current track and Now Playing's mixer display, driven by your USB MIDI controller.",
  events: ["track", "controller"],
};

export default function MixerTheme({ track, controller }: ThemeProps) {
  return (
    <div style={{ width: 640, maxWidth: "100%", fontFamily: "system-ui" }}>
      <div className="mb-3 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
        <AlbumArt src={track?.artworkUrlSmall ?? track?.artworkUrl} size="md" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            Now playing
          </p>
          <h2 className="truncate text-sm font-semibold" title={track?.title}>
            {track?.title || "Waiting for track"}
          </h2>
          {track?.artist && (
            <p className="truncate text-xs text-zinc-400" title={track.artist}>
              {track.artist}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-[320px] shrink-0">
          <ControllerMixer snapshot={controller ?? null} />
        </div>
        <TransportControls controller={controller} />
      </div>
    </div>
  );
}
