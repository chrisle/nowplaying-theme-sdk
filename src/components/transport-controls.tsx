import { controllerValue, type ThemeControllerSnapshot } from "../events";

export function TransportControls({
  controller,
}: {
  controller: ThemeControllerSnapshot | null | undefined;
}) {
  const decks = [
    ...new Set(
      controller?.availableControls.flatMap((path) => {
        const match = /^deck([1-6])\./.exec(path);
        return match ? [Number(match[1])] : [];
      }) ?? [],
    ),
  ].sort((a, b) => a - b);
  return (
    <div className="flex-1 space-y-3 text-white">
      {(decks.length ? decks : [1, 2, 3, 4]).map((deck) => {
        const value = (key: string) =>
          controllerValue(controller, `deck${deck}.${key}`);
        const count = (key: string) => {
          const result = value(key);
          return typeof result === "number" ? result : "—";
        };
        return (
          <section
            key={deck}
            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs"
            aria-label={`Deck ${deck} transport`}
          >
            <h3 className="mb-2 font-semibold text-zinc-300">Deck {deck}</h3>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["playing", "Play"],
                  ["cueActive", "Cue"],
                  ["loopActive", "Loop"],
                  ["jogTouching", "Jog touch"],
                ] as const
              ).map(([key, label]) => {
                const result = value(key);
                return (
                  <span
                    key={key}
                    className={`rounded px-2 py-1 ${result === true ? "bg-orange-500/20 text-orange-400" : "bg-zinc-900 text-zinc-500"}`}
                  >
                    {label}:{" "}
                    {typeof result === "boolean"
                      ? result
                        ? "on"
                        : "off"
                      : "—"}
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-zinc-400">
              Play presses {count("playPressCount")} · Cue presses{" "}
              {count("cuePressCount")}
            </p>
            <p className="mt-1 text-zinc-400">
              Loop in {count("loopInCount")} · Out {count("loopOutCount")} ·
              Half {count("loopHalfCount")} · Double {count("loopDoubleCount")}
            </p>
            <p className="mt-1 text-zinc-400">
              Jog raw {count("jogValue")} · Messages {count("jogSequence")}
            </p>
          </section>
        );
      })}
    </div>
  );
}
