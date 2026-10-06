import { ControllerMixer } from "./mixer";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EnrichedTrack } from "../types";
import {
  EMPTY_EVENTS,
  decodeThemeMessage,
  parseRecording,
  reduceThemeMessage,
  subscribedProps,
  type RecordedFrame,
  type ThemeEvent,
  type ThemeEventState,
  type ThemeMessage,
} from "../events";
import {
  DECK_CONTROLS,
  moveSimulatedControl,
  simulatedController,
  simulatedMix,
} from "./simulated-events";

type InputMode = "simulation" | "live" | "replay";
const button =
  "bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 text-xs";

export function useThemeInputs(
  track: EnrichedTrack,
  events?: readonly ThemeEvent[],
) {
  const [mode, setMode] = useState<InputMode>("simulation");
  const [state, setState] = useState<ThemeEventState>(EMPTY_EVENTS);
  const [status, setStatus] = useState("Simulated controls");
  const [frames, setFrames] = useState<RecordedFrame[]>([]);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const recordRef = useRef<{ start: number; frames: RecordedFrame[] } | null>(
    null,
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const sim = useRef(simulatedController());
  const apply = useCallback((raw: unknown) => {
    const message = decodeThemeMessage(raw);
    if (!message) return;
    setState((previous) => reduceThemeMessage(previous, message));
    const capture = recordRef.current;
    if (capture) {
      capture.frames.push({ at: performance.now() - capture.start, message });
      if (capture.frames.length >= 10000) {
        recordRef.current = null;
        setFrames(capture.frames);
        setRecording(false);
        setStatus("Recording stopped at 10,000 frames");
      }
    }
  }, []);

  useEffect(() => {
    setState(EMPTY_EVENTS);
    if (mode === "simulation") {
      setStatus("Simulated controls — mix scores are mocked");
      apply({ type: "np:controller", protocol: 1, controller: sim.current });
      apply({ type: "np:mix", protocol: 1, state: simulatedMix(sim.current) });
    }
  }, [mode, apply]);
  useEffect(() => {
    if (mode === "simulation")
      apply({ type: "np:track", protocol: 1, track, connected: true });
  }, [track, mode, apply]);

  useEffect(() => {
    if (mode !== "live") return;
    setStatus("Connecting to Now Playing…");
    const stream = new EventSource("/__np3/events");
    let received = Date.now();
    stream.onopen = () => setStatus("Connected to Now Playing");
    stream.addEventListener("np-event", (event) => {
      try {
        received = Date.now();
        apply(JSON.parse((event as MessageEvent).data));
      } catch {
        setStatus("Received an invalid event");
      }
    });
    stream.onerror = () => {
      apply({ type: "np:track", protocol: 1, track: null, connected: false });
      apply({ type: "np:mix", protocol: 1, state: null });
      apply({ type: "np:controller", protocol: 1, controller: null });
      setStatus(
        "Feed unavailable. Start NP3 and the SDK with the same NP_THEME_DEV_TOKEN.",
      );
    };
    const lease = setInterval(() => {
      if (Date.now() - received > 6000) {
        apply({ type: "np:controller", protocol: 1, controller: null });
        setStatus("Waiting for controller feed…");
      }
    }, 1000);
    return () => {
      stream.close();
      clearInterval(lease);
    };
  }, [mode, apply]);

  useEffect(() => {
    if (mode !== "replay" || !playing || !frames.length) return;
    setState(EMPTY_EVENTS);
    const started = performance.now();
    let index = 0;
    let animation = 0;
    const tick = () => {
      const elapsed = performance.now() - started;
      while (index < frames.length && frames[index]!.at <= elapsed)
        apply(frames[index++]!.message);
      if (index < frames.length) animation = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        setStatus("Replay complete");
      }
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [mode, playing, frames, apply]);

  const stopRecording = () => {
    const capture = recordRef.current;
    recordRef.current = null;
    setRecording(false);
    if (capture) setFrames([...capture.frames]);
  };
  const changeMode = (next: InputMode) => {
    stopRecording();
    setPlaying(false);
    setMode(next);
  };
  const startRecording = () => {
    const current = stateRef.current;
    const messages: ThemeMessage[] = [
      {
        type: "np:track",
        protocol: 1,
        track: current.track,
        connected: current.connected,
      },
      { type: "np:mix", protocol: 1, state: current.mixState },
      { type: "np:controller", protocol: 1, controller: current.controller },
    ];
    recordRef.current = {
      start: performance.now(),
      frames: messages.map((message) => ({ at: 0, message })),
    };
    setRecording(true);
  };
  const move = (path: string, value: number | boolean) => {
    sim.current = moveSimulatedControl(sim.current, path, value);
    apply({ type: "np:controller", protocol: 1, controller: sim.current });
    apply({ type: "np:mix", protocol: 1, state: simulatedMix(sim.current) });
  };
  const replay = () => {
    stopRecording();
    setMode("replay");
    setPlaying(true);
    setStatus("Replaying recorded events");
  };
  const loadRecording = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Recording exceeds 10 MB");
      const loaded = parseRecording(JSON.parse(await file.text()));
      stopRecording();
      setPlaying(false);
      setFrames(loaded);
      setMode("replay");
      setStatus("Recording loaded. Press Replay.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invalid recording");
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 1, frames })], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "controller-session.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return {
    props: subscribedProps(state, events),
    state,
    mode,
    status,
    recording,
    playing,
    frames,
    changeMode,
    startRecording,
    stopRecording,
    move,
    replay,
    loadRecording,
    download,
  };
}

export function EventInputs({
  inputs,
}: {
  inputs: ReturnType<typeof useThemeInputs>;
}) {
  const [deck, setDeck] = useState(1);
  const state = inputs.state.controller?.state;
  const selected = state?.[`deck${deck}` as "deck1"];
  return (
    <section
      className="p-4 border-b border-zinc-800 text-zinc-300 text-xs space-y-3"
      aria-label="Theme event inputs"
    >
      <h2 className="text-white font-semibold">Event inputs</h2>
      <label className="flex justify-between items-center">
        Source
        <select
          className={button}
          value={inputs.mode}
          onChange={(e) => inputs.changeMode(e.target.value as InputMode)}
        >
          <option value="simulation">Simulated mixer</option>
          <option value="live">Now Playing / MIDI</option>
          <option value="replay">Recorded session</option>
        </select>
      </label>
      <p role="status" className="text-zinc-400">
        {inputs.status}
      </p>
      <ControllerMixer
        snapshot={inputs.state.controller}
        onChange={inputs.mode === "simulation" ? inputs.move : undefined}
      />
      {inputs.mode === "simulation" && (
        <>
          <label className="flex justify-between">
            Deck
            <select
              className={button}
              value={deck}
              onChange={(e) => setDeck(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {DECK_CONTROLS.filter(
            ([key]) => key === "trim" || key === "tempo",
          ).map(([key, label, min, max]) => (
            <label key={key} className="block">
              <span>
                {label}: {(selected?.[key] ?? 0).toFixed(2)}
              </span>
              <input
                aria-label={`Deck ${deck} ${label}`}
                className="block w-full"
                type="range"
                min={min}
                max={max}
                step="0.01"
                value={selected?.[key] ?? 0}
                onChange={(e) =>
                  inputs.move(`deck${deck}.${key}`, Number(e.target.value))
                }
              />
            </label>
          ))}
          {["playing", "cueActive", "jogTouching"].map((key) => (
            <label key={key} className="flex justify-between">
              {key}
              <input
                type="checkbox"
                checked={Boolean(selected?.[key as "playing"])}
                onChange={(e) =>
                  inputs.move(`deck${deck}.${key}`, e.target.checked)
                }
              />
            </label>
          ))}
        </>
      )}
      {inputs.state.controller && (
        <p>
          {inputs.state.controller.connected
            ? `${inputs.state.controller.state?.controllerName ?? "Controller"}: ${inputs.state.controller.observedControls.length}/${inputs.state.controller.availableControls.length} controls observed`
            : "Controller disconnected"}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {inputs.mode !== "replay" && (
          <button
            className={button}
            onClick={
              inputs.recording ? inputs.stopRecording : inputs.startRecording
            }
          >
            {inputs.recording ? "Stop recording" : "Record"}
          </button>
        )}
        <button
          className={button}
          disabled={!inputs.frames.length || inputs.playing || inputs.recording}
          onClick={inputs.replay}
        >
          Replay
        </button>
        {inputs.playing && (
          <button
            className={button}
            onClick={() => inputs.changeMode("simulation")}
          >
            Stop replay
          </button>
        )}
        <button
          className={button}
          disabled={!inputs.frames.length || inputs.recording}
          onClick={inputs.download}
        >
          Save session
        </button>
        <label className={button}>
          Load session
          <input
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void inputs.loadRecording(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </section>
  );
}
