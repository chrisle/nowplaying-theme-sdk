import type { ControlMapping } from "./controller-state";

// Only controls the MIDI processor currently handles are advertised.
const deckFields: Record<string, string[]> = {
  channel_fader: ["channelFader"],
  eq_high: ["eqHigh"],
  eq_mid: ["eqMid"],
  eq_low: ["eqLow"],
  filter: ["filter", "filterMode"],
  trim: ["trim"],
  tempo: ["tempo"],
  play_pause: ["playing"],
  cue: ["cueActive", "playing"],
  sync: ["syncActive"],
  loop_active: ["loopActive"],
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
