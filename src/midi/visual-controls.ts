import type { ControlMapping, MidiMessage } from "./controller-state";

// Only controls the MIDI processor currently handles are advertised.
const deckFields: Record<string, string[]> = {
  channel_fader: ["channelFader"],
  eq_high: ["eqHigh"],
  eq_mid: ["eqMid"],
  eq_low: ["eqLow"],
  filter: ["filter", "filterMode"],
  trim: ["trim"],
  tempo: ["tempo"],
  play_pause: ["playing", "playPressCount"],
  cue: ["cueActive", "playing", "cuePressCount"],
  sync: ["syncActive"],
  loop_active: ["loopActive"],
  loop_in: ["loopInPressed", "loopInCount"],
  loop_out: ["loopOutPressed", "loopOutCount"],
  loop_half: ["loopHalfPressed", "loopHalfCount"],
  loop_double: ["loopDoublePressed", "loopDoubleCount"],
  jog_turn: ["jogValue", "jogSequence"],
  key_lock: ["keyLock"],
  jog_touch: ["jogTouching"],
  master: ["master"],
};
const mixerFields: Record<string, string[]> = {
  crossfader: ["crossfader"],
  master_volume: ["masterVolume"],
  headphone_mix: ["headphoneMix"],
  headphone_volume: ["headphoneVolume"],
};
export function visualControlPaths(control: ControlMapping): string[] {
  if ((control as ControlMapping & { isOutput?: boolean }).isOutput) return [];
  return control.deck === undefined
    ? (mixerFields[control.controlType] ?? [])
    : (deckFields[control.controlType] ?? []).map(
        (field) => `deck${control.deck}.${field}`,
      );
}

/** Releases establish momentary button state, but never toggle state or press counts. */
export function observedControlPaths(
  control: ControlMapping,
  message: MidiMessage,
): string[] {
  const pressed =
    message.type !== "note_off" && (message.velocity ?? message.value ?? 0) > 0;
  if (
    ["play_pause", "sync", "loop_active", "key_lock"].includes(
      control.controlType,
    ) &&
    (message.type !== "note_on" || !pressed)
  )
    return [];
  return visualControlPaths(control).filter(
    (path) => pressed || !/Count$/.test(path),
  );
}
