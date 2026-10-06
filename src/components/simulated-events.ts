import type {
  ControllerState,
  MixProcessorState,
  ThemeControllerSnapshot,
} from "../events";

export const DECK_CONTROLS = [
  ["channelFader", "Fader", 0, 1],
  ["eqLow", "Low EQ", -1, 1],
  ["eqMid", "Mid EQ", -1, 1],
  ["eqHigh", "High EQ", -1, 1],
  ["filter", "Filter", -1, 1],
  ["trim", "Trim", 0, 1],
  ["tempo", "Pitch", -1, 1],
] as const;
const deck = () => ({
  channelFader: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  filter: 0,
  filterMode: "normal" as const,
  trim: 0.5,
  tempo: 0,
  playing: false,
  cueActive: false,
  syncActive: false,
  master: false,
  loopActive: false,
  keyLock: false,
  jogTouching: false,
});
export function simulatedController(): ThemeControllerSnapshot {
  const availableControls = [
    "crossfader",
    ...[1, 2, 3, 4].flatMap((n) =>
      [
        ...DECK_CONTROLS.map(([key]) => key),
        "playing",
        "cueActive",
        "jogTouching",
        "filterMode",
      ].map((key) => `deck${n}.${key}`),
    ),
  ];
  return {
    sourceId: "simulation",
    connected: true,
    timestamp: Date.now(),
    availableControls,
    observedControls: [...availableControls],
    state: {
      deck1: deck(),
      deck2: deck(),
      deck3: deck(),
      deck4: deck(),
      crossfader: 0,
      masterVolume: 1,
      headphoneMix: 0,
      headphoneVolume: 0.5,
      controllerName: "Simulated mixer",
      lastUpdateMs: Date.now(),
    },
  };
}
export function moveSimulatedControl(
  snapshot: ThemeControllerSnapshot,
  path: string,
  value: number | boolean,
): ThemeControllerSnapshot {
  const state = structuredClone(snapshot.state!) as ControllerState;
  const [parent, key] = path.split(".");
  if (key) {
    const d = state[parent as "deck1"]!;
    Object.assign(d, { [key]: value });
    if (key === "filter" && typeof value === "number")
      d.filterMode = value < -0.05 ? "lpf" : value > 0.05 ? "hpf" : "normal";
  } else Object.assign(state, { [parent!]: value });
  state.lastUpdateMs = Date.now();
  return { ...snapshot, state, timestamp: Date.now() };
}
/** Mock projection only; this does not claim to reproduce NP3's mix scoring. */
export function simulatedMix(
  snapshot: ThemeControllerSnapshot,
): MixProcessorState {
  const weights = {
    channelFader: 0,
    crossfader: 0,
    playing: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    jogTouching: 0,
    master: 0,
    isOnAir: 0,
    filter: 0,
  };
  const channels = [1, 2, 3, 4].map((n) => {
    const d = snapshot.state![`deck${n}` as "deck1"]!;
    return {
      channelNumber: n,
      device: null,
      track: null,
      signals: { ...d, looping: d.loopActive },
      score: {
        normalizedScore: 0,
        rawScore: 0,
        totalWeight: 0,
        contributions: { ...weights, trim: 0 },
      },
    };
  });
  return {
    mixer: {
      sourceId: "simulation",
      userId: "",
      crossfader: {
        position: snapshot.state!.crossfader,
        assignmentA: [1, 3],
        assignmentB: [2, 4],
      },
    },
    channels: [channels[0]!, channels[1]!, channels[2]!, channels[3]!],
    onAir: {
      currentOnAir: { channelNumber: null, deckId: null },
      pendingWinner: {
        channelNumber: null,
        deckId: null,
        debounceStartedAt: null,
        debounceMs: 0,
      },
    },
    config: {
      djStyle: "custom",
      debounceMs: 0,
      weights,
      thresholds: {
        faderMinimum: 0,
        eqCutThreshold: -0.5,
        scoreMinimum: 0,
        crossfaderDeadZone: 0,
      },
    },
    lastUpdateAt: new Date().toISOString(),
  };
}
