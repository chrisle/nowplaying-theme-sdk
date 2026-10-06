import type { ThemeMeta, ThemeProps } from "../theme";
import { controllerValue } from "../events";

export const meta: ThemeMeta = {
  id: "reactive-mixer",
  name: "Reactive Mixer",
  width: 1280,
  height: 300,
  description:
    "Faders set bar heights; EQ and filter set color. Unknown controls remain dim.",
  events: ["track", "controller"],
};

export default function ReactiveMixer({ track, controller }: ThemeProps) {
  const crossfader = controllerValue(controller, "crossfader");
  return (
    <div
      style={{
        width: "100%",
        padding: 24,
        color: "white",
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ fontSize: 22 }}>
        {track ? `${track.artist} — ${track.title}` : "Waiting for track"}
      </h1>
      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        {[1, 2, 3, 4].map((n) => {
          const fader = controllerValue(controller, `deck${n}.channelFader`);
          const low = controllerValue(controller, `deck${n}.eqLow`);
          const filter = controllerValue(controller, `deck${n}.filter`);
          const known = typeof fader === "number";
          const hue = 180 + (typeof filter === "number" ? filter * 100 : 0);
          return (
            <div key={n} style={{ flex: 1 }}>
              <div
                style={{
                  height: 140,
                  background: "#18181b",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: known ? `${fader * 100}%` : "4%",
                    background: known
                      ? `hsl(${hue} 80% ${45 + (typeof low === "number" ? low * 15 : 0)}%)`
                      : "#3f3f46",
                    borderRadius: 8,
                    transition: "height 40ms linear, background 40ms linear",
                  }}
                />
              </div>
              <p style={{ marginTop: 8 }}>
                Channel {n}: {known ? fader.toFixed(2) : "unknown"}
              </p>
            </div>
          );
        })}
      </div>
      <p>
        Crossfader:{" "}
        {typeof crossfader === "number" ? crossfader.toFixed(2) : "unknown"}
      </p>
    </div>
  );
}
