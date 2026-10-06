import type { EnrichedTrack } from "./types";
import type { MixProcessorState } from "./mix-types";
import type { ControllerState } from "./controller-types";
export type { MixProcessorState, ControllerState };
export type ThemeEvent = "track" | "mix" | "controller";

export interface ThemeControllerSnapshot {
  sourceId: "midi" | "simulation";
  connected: boolean;
  state: ControllerState | null;
  availableControls: string[];
  observedControls: string[];
  timestamp: number;
}
export interface ThemeEventState {
  track: EnrichedTrack | null;
  mixState: MixProcessorState | null;
  controller: ThemeControllerSnapshot | null;
  connected: boolean;
}
export const EMPTY_EVENTS: ThemeEventState = {
  track: null,
  mixState: null,
  controller: null,
  connected: false,
};
export type ThemeMessage =
  | { type: "np:hello"; protocol: 1; connected?: boolean }
  | {
      type: "np:track";
      protocol: 1;
      track: EnrichedTrack | null;
      connected?: boolean;
    }
  | { type: "np:mix"; protocol: 1; state: MixProcessorState | null }
  | {
      type: "np:controller";
      protocol: 1;
      controller: ThemeControllerSnapshot | null;
    };

/** Both iframe delivery and the playground enter through this decoder. */
export function decodeThemeMessage(raw: unknown): ThemeMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (m.protocol !== 1) return null;
  if (m.connected !== undefined && typeof m.connected !== "boolean")
    return null;
  if (m.type === "np:hello") return m as ThemeMessage;
  if (m.type === "np:track") {
    if (
      m.track !== null &&
      (!m.track ||
        typeof m.track !== "object" ||
        typeof (m.track as EnrichedTrack).title !== "string" ||
        typeof (m.track as EnrichedTrack).artist !== "string")
    )
      return null;
    return m as ThemeMessage;
  }
  if (m.type === "np:mix") {
    if (
      m.state !== null &&
      (!m.state ||
        typeof m.state !== "object" ||
        !Array.isArray((m.state as MixProcessorState).channels) ||
        !(m.state as MixProcessorState).mixer)
    )
      return null;
    return m as ThemeMessage;
  }
  if (m.type === "np:controller") {
    if (m.controller === null) return m as ThemeMessage;
    if (!isThemeControllerSnapshot(m.controller)) return null;
    return m as ThemeMessage;
  }
  return null;
}

export function reduceThemeMessage(
  state: ThemeEventState,
  raw: unknown,
): ThemeEventState {
  const m = decodeThemeMessage(raw);
  if (!m) return state;
  switch (m.type) {
    case "np:hello":
      return { ...state, connected: m.connected ?? state.connected };
    case "np:track":
      return {
        ...state,
        track: m.track,
        connected: m.connected ?? state.connected,
      };
    case "np:mix":
      return { ...state, mixState: m.state };
    case "np:controller":
      return { ...state, controller: m.controller };
  }
}

/** Missing subscriptions preserve the legacy track + mix behavior. */
export function subscribedProps(
  state: ThemeEventState,
  events?: readonly ThemeEvent[],
): ThemeEventState {
  const requested = events ?? ["track", "mix"];
  return {
    track: requested.includes("track") ? state.track : null,
    mixState: requested.includes("mix") ? state.mixState : null,
    controller: requested.includes("controller") ? state.controller : null,
    connected: state.connected,
  };
}

/** Returns undefined for unavailable or never-observed values. */
export function controllerValue(
  snapshot: ThemeControllerSnapshot | null | undefined,
  path: string,
): number | boolean | string | undefined {
  if (!snapshot?.connected || !snapshot.observedControls.includes(path))
    return undefined;
  const parts = path.split(".");
  let value: unknown = snapshot.state;
  for (const part of parts) {
    if (
      !value ||
      typeof value !== "object" ||
      !Object.prototype.hasOwnProperty.call(value, part)
    )
      return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean" ||
    typeof value === "string"
    ? value
    : undefined;
}

export interface RecordedFrame {
  at: number;
  message: ThemeMessage;
}
export function parseRecording(raw: unknown): RecordedFrame[] {
  if (
    !raw ||
    typeof raw !== "object" ||
    (raw as { version?: unknown }).version !== 1
  )
    throw new Error("Unsupported recording version");
  const frames = (raw as { frames?: unknown }).frames;
  if (!Array.isArray(frames) || frames.length === 0 || frames.length > 10000)
    throw new Error("Recording must contain 1–10,000 frames");
  let previous = 0;
  return frames.map((frame) => {
    if (
      !frame ||
      typeof frame.at !== "number" ||
      !Number.isFinite(frame.at) ||
      frame.at < previous ||
      frame.at > 3600000
    )
      throw new Error("Invalid recording timing");
    const message = decodeThemeMessage(frame.message);
    if (!message) throw new Error("Invalid recorded event");
    previous = frame.at;
    return { at: frame.at, message };
  });
}

export function isThemeControllerSnapshot(
  value: unknown,
): value is ThemeControllerSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const paths = (a: unknown): a is string[] =>
    Array.isArray(a) &&
    a.length <= 128 &&
    a.every(
      (p) => typeof p === "string" && /^(deck[1-6]\.)?[a-zA-Z]{1,32}$/.test(p),
    );
  if (v.sourceId !== "midi" && v.sourceId !== "simulation") return false;
  if (
    typeof v.connected !== "boolean" ||
    typeof v.timestamp !== "number" ||
    !Number.isFinite(v.timestamp)
  )
    return false;
  const available = v.availableControls;
  const observed = v.observedControls;
  if (
    !paths(available) ||
    !paths(observed) ||
    !observed.every((p) => available.includes(p))
  )
    return false;
  if (v.state === null) return !v.connected;
  if (!v.connected || typeof v.state !== "object" || Array.isArray(v.state))
    return false;
  const state = v.state as Record<string, unknown>;
  if (!state.deck1 || !state.deck2 || typeof state.crossfader !== "number")
    return false;
  // A small JSON tree of normalized numbers, flags and metadata only.
  const valid = (x: unknown, depth: number): boolean =>
    depth <= 2 &&
    (typeof x === "boolean" ||
      (typeof x === "string" && x.length <= 128) ||
      (typeof x === "number" && Number.isFinite(x)) ||
      (!!x &&
        typeof x === "object" &&
        !Array.isArray(x) &&
        Object.keys(x).length <= 32 &&
        Object.values(x).every((y) => valid(y, depth + 1))));
  return valid(state, 0);
}
