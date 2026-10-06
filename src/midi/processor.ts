/**
 * MIDI message processing functions.
 *
 * Values are normalized at this layer before being stored in ControllerState:
 * - Linear signals (faders, EQ, trim): 0.0 - 1.0
 * - Bipolar signals (crossfader, filter): -1.0 - 1.0
 */

import type {
  ControllerMapping,
  ControlMapping,
  ControllerState,
  DeckState,
  MidiMessage,
} from "./controller-state";
import { createDefaultDeckState } from "./controller-state";
import { normalizeBipolar, normalizeLinear } from "./signal-normalization";

/**
 * Find a control mapping for a MIDI message
 */
export function findControlMapping(
  mapping: ControllerMapping,
  message: MidiMessage,
): ControlMapping | undefined {
  if (!message.channel) return undefined;

  // For CC messages
  if (message.type === "cc" && message.controller !== undefined) {
    return mapping.controls.find(
      (c) => c.channel === message.channel && c.cc === message.controller,
    );
  }

  // For Note On/Off messages
  if (
    (message.type === "note_on" || message.type === "note_off") &&
    message.note !== undefined
  ) {
    return mapping.controls.find(
      (c) => c.channel === message.channel && c.note === message.note,
    );
  }

  return undefined;
}

/**
 * Apply a MIDI message to a controller state
 */
export function applyMidiMessage(
  state: ControllerState,
  mapping: ControllerMapping,
  message: MidiMessage,
  debug = false,
): ControllerState {
  const control = findControlMapping(mapping, message);
  if (!control) {
    // Debug: log unmatched CC messages when NP_MIDI_MATCH_DEBUG=1
    if (debug && message.type === "cc") {
      console.log(
        `[MIDI] No control match: ch=${message.channel} cc=${message.controller} val=${message.value}`,
      );
    }
    return state;
  }

  // Debug: log matched controls for EQ/filter/trim/loop when debug is enabled
  if (
    debug &&
    ["eq_low", "eq_mid", "eq_high", "filter", "trim", "loop_active"].includes(
      control.controlType,
    )
  ) {
    console.log(
      `[MIDI] Matched ${control.controlType} deck=${control.deck} ch=${message.channel} cc=${message.controller} val=${message.value}`,
    );
  }

  // Get the value (handle inversion)
  let value = message.value ?? message.velocity ?? 0;
  if (control.invert) {
    value = 127 - value;
  }

  // For buttons, convert to boolean
  const pressed = message.type !== "note_off" && value > 0;
  const boolValue = control.isButton ? pressed : undefined;

  // Create a new state (immutable update)
  const newState = { ...state, lastUpdateMs: message.timestamp };

  // Handle deck-specific controls
  if (control.deck !== undefined) {
    const deckKey = `deck${control.deck}` as
      | "deck1"
      | "deck2"
      | "deck3"
      | "deck4"
      | "deck5"
      | "deck6";
    const currentDeck = state[deckKey] ?? createDefaultDeckState();
    const newDeck: DeckState = { ...currentDeck };

    switch (control.controlType) {
      case "channel_fader":
        newDeck.channelFader = normalizeLinear(value);
        break;
      case "eq_high":
        newDeck.eqHigh = normalizeBipolar(value);
        if (debug)
          console.log(
            `[MIDI] EQ High deck${control.deck}: midi=${value} → normalized=${newDeck.eqHigh}`,
          );
        break;
      case "eq_mid":
        newDeck.eqMid = normalizeBipolar(value);
        if (debug)
          console.log(
            `[MIDI] EQ Mid deck${control.deck}: midi=${value} → normalized=${newDeck.eqMid}`,
          );
        break;
      case "eq_low":
        newDeck.eqLow = normalizeBipolar(value);
        if (debug)
          console.log(
            `[MIDI] EQ Low deck${control.deck}: midi=${value} → normalized=${newDeck.eqLow}`,
          );
        break;
      case "filter":
        newDeck.filter = normalizeBipolar(value);
        // Derive filterMode from filter value: < 0 = LPF, > 0 = HPF, 0 = normal
        newDeck.filterMode =
          newDeck.filter < -0.05
            ? "lpf"
            : newDeck.filter > 0.05
              ? "hpf"
              : "normal";
        if (debug)
          console.log(
            `[MIDI] Filter deck${control.deck}: midi=${value} → normalized=${newDeck.filter} mode=${newDeck.filterMode}`,
          );
        break;
      case "trim":
        newDeck.trim = normalizeLinear(value);
        if (debug)
          console.log(
            `[MIDI] Trim deck${control.deck}: midi=${value} → normalized=${newDeck.trim}`,
          );
        break;
      case "tempo":
        newDeck.tempo = normalizeBipolar(value);
        break;
      case "play_pause":
        if (boolValue === true && message.type === "note_on") {
          newDeck.playPressCount = (currentDeck.playPressCount ?? 0) + 1;
          newDeck.playPressedAt = message.timestamp;
          // The first play press after a cue release definitively starts
          // playback, which avoids toggle tracking issues where state gets
          // out of sync. Only the first: a later press is the DJ pausing, and
          // treating every press after one cue release as "start" left a
          // paused deck reading as playing for the rest of the set (NP3-414).
          if (
            currentDeck.cueReleasedAt &&
            message.timestamp > currentDeck.cueReleasedAt &&
            (currentDeck.playPressedAt ?? 0) < currentDeck.cueReleasedAt
          ) {
            newDeck.playing = true;
          } else {
            // Fall back to toggle for cases without recent cue release
            newDeck.playing = !currentDeck.playing;
          }
        }
        break;
      case "cue":
        newDeck.cueActive = boolValue ?? false;
        if (pressed)
          newDeck.cuePressCount = (currentDeck.cuePressCount ?? 0) + 1;
        // Releasing cue stops playback (deck pauses at cue point)
        // This is a definitive state - we KNOW the deck is not playing after cue release
        if (!boolValue) {
          newDeck.playing = false;
          newDeck.cueReleasedAt = message.timestamp;
        }
        break;
      case "sync":
        if (boolValue === true && message.type === "note_on") {
          newDeck.syncActive = !currentDeck.syncActive;
        }
        break;
      case "loop_active":
        if (boolValue === true && message.type === "note_on") {
          newDeck.loopActive = !currentDeck.loopActive;
        }
        break;
      case "key_lock":
        if (boolValue === true && message.type === "note_on") {
          newDeck.keyLock = !currentDeck.keyLock;
        }
        break;
      case "loop_in":
        newDeck.loopInPressed = pressed;
        if (pressed) newDeck.loopInCount = (currentDeck.loopInCount ?? 0) + 1;
        break;
      case "loop_out":
        newDeck.loopOutPressed = pressed;
        if (pressed) newDeck.loopOutCount = (currentDeck.loopOutCount ?? 0) + 1;
        break;
      case "loop_half":
        newDeck.loopHalfPressed = pressed;
        if (pressed)
          newDeck.loopHalfCount = (currentDeck.loopHalfCount ?? 0) + 1;
        break;
      case "loop_double":
        newDeck.loopDoublePressed = pressed;
        if (pressed)
          newDeck.loopDoubleCount = (currentDeck.loopDoubleCount ?? 0) + 1;
        break;
      case "jog_turn":
        newDeck.jogValue = value;
        newDeck.jogSequence = (currentDeck.jogSequence ?? 0) + 1;
        break;
      case "jog_touch":
        newDeck.jogTouching = boolValue ?? false;
        break;
      case "master":
        newDeck.master = boolValue ?? false;
        break;
    }

    newState[deckKey] = newDeck;
  } else {
    // Handle mixer controls (no deck)
    switch (control.controlType) {
      case "crossfader":
        newState.crossfader = normalizeBipolar(value);
        break;
      case "master_volume":
        newState.masterVolume = normalizeLinear(value);
        break;
      case "headphone_mix":
        newState.headphoneMix = normalizeBipolar(value);
        break;
      case "headphone_volume":
        newState.headphoneVolume = normalizeLinear(value);
        break;
    }
  }

  return newState;
}
