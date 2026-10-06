import type { ControllerMapping, MidiMessage } from "./controller-state";
import { createDefaultControllerState } from "./controller-state";
import { applyMidiMessage, findControlMapping } from "./processor";
import { visualControlPaths } from "./visual-controls";
import type { ThemeControllerSnapshot } from "../events";

export interface MappingEntry {
  hashId: string;
  name: string;
  usbPortNames?: string[];
}
const normalize = (name: string) =>
  name.replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
/** Same name/port matching order as NP3's desktop mapping-api. */
export function matchUsbMapping(name: string, entries: MappingEntry[]) {
  const normalized = normalize(name);
  const names = (entry: MappingEntry) =>
    [entry.name, ...(entry.usbPortNames ?? [])].map(normalize).filter(Boolean);
  return (
    entries.find((entry) => names(entry).includes(normalized)) ??
    [...entries]
      .sort((a, b) => b.name.length - a.name.length)
      .find((entry) =>
        names(entry).some((candidate) => normalized.includes(candidate)),
      )
  );
}

export function parseUsbMidi(
  data: Uint8Array,
  device: string,
  timestamp = Date.now(),
): MidiMessage | null {
  const [status, number, value] = data;
  if (
    status === undefined ||
    number === undefined ||
    value === undefined ||
    number > 127 ||
    value > 127
  )
    return null;
  const channel = (status & 15) + 1;
  switch (status >> 4) {
    case 0xb:
      return {
        type: "cc",
        channel,
        controller: number,
        value,
        device,
        timestamp,
      };
    case 0x8:
      return {
        type: "note_off",
        channel,
        note: number,
        velocity: value,
        device,
        timestamp,
      };
    case 0x9:
      return {
        type: value === 0 ? "note_off" : "note_on",
        channel,
        note: number,
        velocity: value,
        device,
        timestamp,
      };
    default:
      return null;
  }
}

/** Physical USB input and NP3 use the same mapping application and value normalization. */
export function createUsbController(mapping: ControllerMapping) {
  let state = createDefaultControllerState();
  state.controllerName = mapping.name;
  const availableControls = [
    ...new Set(mapping.controls.flatMap(visualControlPaths)),
  ].sort();
  const observed = new Set<string>();
  const snapshot = (): ThemeControllerSnapshot => ({
    sourceId: "midi",
    connected: true,
    state: structuredClone(
      state,
    ) as unknown as import("../events").ControllerState,
    availableControls,
    observedControls: [...observed].sort(),
    timestamp: Date.now(),
  });
  return {
    snapshot,
    receive(data: Uint8Array, device: string) {
      const message = parseUsbMidi(data, device);
      if (!message) return null;
      const control = findControlMapping(mapping, message);
      if (!control || !visualControlPaths(control).length) return null;
      for (const path of visualControlPaths(control)) observed.add(path);
      state = applyMidiMessage(state, mapping, message);
      return snapshot();
    },
  };
}
