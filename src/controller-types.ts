/* eslint-disable */
/**
 * AUTO-GENERATED FILE - DO NOT EDIT!
 * Generated from: schemas/controller-state.schema.json
 * Run: cd schemas && npm run generate
 */

export interface DeckState {
  /**
   * Channel fader position (0=closed, 1=full)
   */
  channelFader: number;
  /**
   * High EQ knob position (-1=full cut, 0=unity, 1=full boost)
   */
  eqHigh: number;
  /**
   * Mid EQ knob position (-1=full cut, 0=unity, 1=full boost)
   */
  eqMid: number;
  /**
   * Low EQ knob position (-1=full cut, 0=unity, 1=full boost)
   */
  eqLow: number;
  /**
   * Filter knob position (-1=full LPF, 0=off/center, 1=full HPF)
   */
  filter: number;
  /**
   * Active filter mode - normal (no filter), lpf (low-pass), or hpf (high-pass)
   */
  filterMode: "normal" | "lpf" | "hpf";
  /**
   * Trim/gain knob position (0=min, 1=max)
   */
  trim: number;
  /**
   * Tempo/pitch fader position (-1=min, 0=center, 1=max)
   */
  tempo: number;
  /**
   * Whether the deck is currently playing
   */
  playing: boolean;
  /**
   * Whether the cue button is pressed (monitoring in headphones)
   */
  cueActive: boolean;
  /**
   * Whether sync is active on this deck
   */
  syncActive: boolean;
  /**
   * Whether this deck is the sync/tempo master
   */
  master: boolean;
  /**
   * Whether the deck is currently looping
   */
  loopActive: boolean;
  /**
   * Loop length in beats (e.g., 0.5, 1, 2, 4, 8)
   */
  loopBeats?: number;
  /**
   * Whether key lock is enabled
   */
  keyLock: boolean;
  /**
   * Whether DJ is touching the jog wheel
   */
  jogTouching: boolean;
  /**
   * Hardware on-air indicator from DJM mixer (if available)
   */
  isOnAir?: boolean;
  /**
   * Mapped input event count since connection/reset.
   */
  jogSequence?: number;
  /**
   * Mapped input event count since connection/reset.
   */
  playPressCount?: number;
  /**
   * Mapped input event count since connection/reset.
   */
  cuePressCount?: number;
  /**
   * Mapped input event count since connection/reset.
   */
  loopInCount?: number;
  /**
   * Mapped input event count since connection/reset.
   */
  loopOutCount?: number;
  /**
   * Mapped input event count since connection/reset.
   */
  loopHalfCount?: number;
  /**
   * Mapped input event count since connection/reset.
   */
  loopDoubleCount?: number;
  /**
   * Raw jog-turn MIDI value. Direction/relative encoding is controller-specific.
   */
  jogValue?: number;
  /**
   * Whether the mapped loop button is pressed.
   */
  loopInPressed?: boolean;
  /**
   * Whether the mapped loop button is pressed.
   */
  loopOutPressed?: boolean;
  /**
   * Whether the mapped loop button is pressed.
   */
  loopHalfPressed?: boolean;
  /**
   * Whether the mapped loop button is pressed.
   */
  loopDoublePressed?: boolean;
  [k: string]: unknown;
}

export interface ControllerState {
  deck1: DeckState;
  deck2: DeckState;
  deck3?: DeckState;
  deck4?: DeckState;
  deck5?: DeckState;
  deck6?: DeckState;
  /**
   * Crossfader position (-1=left, 0=center, 1=right)
   */
  crossfader: number;
  /**
   * Master volume (0=silent, 1=full)
   */
  masterVolume: number;
  /**
   * Headphone cue/master mix (-1=cue, 0=center, 1=master)
   */
  headphoneMix: number;
  /**
   * Headphone volume (0=silent, 1=full)
   */
  headphoneVolume: number;
  /**
   * Name of the controller (e.g., 'DDJ-FLX4', 'StageLinq')
   */
  controllerName?: string;
  /**
   * Timestamp of last update in milliseconds
   */
  lastUpdateMs: number;
  [k: string]: unknown;
}

export interface ControllerStateMessage {
  /**
   * User ID (added by web API, not sent by desktop)
   */
  userId: string;
  /**
   * Source identifier (e.g., 'midi', 'stagelinq', 'prodjlink')
   */
  sourceId?: string;
  deck1: DeckState;
  deck2: DeckState;
  deck3?: DeckState;
  deck4?: DeckState;
  deck5?: DeckState;
  deck6?: DeckState;
  /**
   * Crossfader position (-1=left, 0=center, 1=right)
   */
  crossfader: number;
  /**
   * Master volume (0=silent, 1=full)
   */
  masterVolume?: number;
  /**
   * Headphone cue/master mix (-1=cue, 0=center, 1=master)
   */
  headphoneMix?: number;
  /**
   * Headphone volume (0=silent, 1=full)
   */
  headphoneVolume?: number;
  /**
   * Name of the controller (e.g., 'DDJ-FLX4', 'StageLinq')
   */
  controllerName?: string;
  /**
   * Timestamp of last update in milliseconds
   */
  lastUpdateMs?: number;
  [k: string]: unknown;
}
