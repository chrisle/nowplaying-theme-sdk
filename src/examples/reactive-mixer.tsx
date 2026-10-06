import type { ThemeMeta, ThemeProps } from "../theme";
import { ControllerMixer } from "../components/mixer";

export const meta: ThemeMeta = {
  id: "reactive-mixer",
  name: "MIDI Playground",
  width: 320,
  height: 520,
  description:
    "Now Playing's mixer display, driven by your USB MIDI controller.",
  events: ["controller"],
};

export default function MixerTheme({ controller }: ThemeProps) {
  return (
    <div style={{ width: 320, maxWidth: "100%", fontFamily: "system-ui" }}>
      <ControllerMixer snapshot={controller ?? null} />
    </div>
  );
}
