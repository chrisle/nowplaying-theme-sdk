/**
 * Controller State types for MIDI-based DJ controller data.
 *
 * These types represent the standardized state of DJ controllers,
 * regardless of the specific controller model or MIDI mapping used.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  SYNC WARNING: Core types must match the Python definitions!              ║
 * ║                                                                            ║
 * ║  Python file: services/common/src/service_shared/controller_state.py      ║
 * ║                                                                            ║
 * ║  Synced types:                                                             ║
 * ║    - DeckState, ControllerState                                            ║
 * ║    - MidiMessage, MidiMessageType                                          ║
 * ║    - ControlType, ControlMapping, ControllerMapping                        ║
 * ║                                                                            ║
 * ║  Note: TypeScript DeckState has extra fields (cueReleasedAt, playPressedAt)║
 * ║  used only by the MIDI processor. Python ignores these with extra="ignore" ║
 * ║                                                                            ║
 * ║  To verify sync, run:                                                      ║
 * ║    npm test -w @nowplaying/shared                                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// ============================================================================
// MIDI Message Types
// ============================================================================

export type MidiMessageType =
  | "note_on"
  | "note_off"
  | "cc" // Control Change
  | "program" // Program Change
  | "sysex" // System Exclusive
  | "poly_aftertouch" // Polyphonic aftertouch
  | "aftertouch" // Channel aftertouch
  | "pitch_bend" // Pitch bend
  | "mtc" // MIDI Time Code
  | "song_position" // Song position pointer
  | "song_select" // Song select
  | "tune_request" // Tune request
  | "clock" // Timing clock
  | "start" // Start
  | "continue" // Continue
  | "stop" // Stop
  | "active_sensing" // Active sensing
  | "reset" // System reset
  | "ready" // Bridge ready message
  | "error" // Error message
  | "status"; // Status update

/**
 * MIDI message from the midi-bridge CLI.
 *
 * This is the raw MIDI message output from the midi-bridge.
 * The desktop app processes these and transforms them into ControllerState.
 */
export interface MidiMessage {
  type: MidiMessageType;
  device?: string; // MIDI device name the message came from
  channel?: number; // MIDI channel (1-16), 0 for system messages
  note?: number; // Note number (0-127) for note messages
  velocity?: number; // Velocity (0-127) for note messages
  controller?: number; // Controller number (0-127) for CC messages
  value?: number; // Value (0-127) for CC/program/aftertouch, 0-16383 for pitch bend
  data?: number[]; // Raw bytes for SysEx messages
  timestamp: number; // Unix timestamp in milliseconds
}

export type MidiBridgeMode = "listen" | "virtual";

/**
 * Ready message sent by the midi-bridge when it's connected and ready.
 */
export interface MidiReadyMessage {
  type: "ready";
  device: string; // Connected device name(s), comma-separated if multiple
  platform: "darwin" | "win32" | "linux";
  mode: MidiBridgeMode; // "listen" for physical devices, "virtual" for virtual port
  deviceCount: number; // Number of connected MIDI devices
}

/**
 * Error message sent by the midi-bridge when something goes wrong.
 */
export interface MidiErrorMessage {
  type: "error";
  message: string;
}

/**
 * Status message sent by the midi-bridge when connection state changes.
 */
export interface MidiStatusMessage {
  type: "status";
  connected: boolean;
  deviceCount: number;
}

/**
 * Union type for all possible messages from the midi-bridge CLI.
 */
export type MidiBridgeMessage =
  | MidiMessage
  | MidiReadyMessage
  | MidiErrorMessage
  | MidiStatusMessage;

// ============================================================================
// Control Mapping Types
// ============================================================================

export type ControlType =
  // Deck controls
  | "channel_fader"
  | "eq_high"
  | "eq_mid"
  | "eq_low"
  | "filter"
  | "trim" // aka Gain
  // Transport controls
  | "play_pause"
  | "cue"
  | "sync"
  // Loop controls
  | "loop_in"
  | "loop_out"
  | "loop_active"
  | "loop_half"
  | "loop_double"
  // Performance pads
  | "hot_cue"
  | "pad_mode"
  // Jog wheel
  | "jog_touch"
  | "jog_turn"
  // Mixer controls
  | "crossfader"
  | "master_volume"
  | "headphone_mix"
  | "headphone_volume"
  // Other
  | "tempo" // Pitch fader
  | "key_lock"
  | "master"; // Master/sync source

export interface ControlMapping {
  controlType: ControlType;
  deck?: number; // 1-6 - undefined for mixer controls
  channel: number; // MIDI channel (1-16)
  cc?: number; // CC number for CC messages
  note?: number; // Note number for note messages
  isButton?: boolean; // True for on/off controls
  invert?: boolean; // True if 0=max, 127=min
}

export interface ControllerMapping {
  vendorId: number;
  productId: number;
  name: string; // e.g., "DDJ-FLX4"
  vendorName: string; // e.g., "Pioneer DJ"
  deckCount: number; // 2, 4, or 6
  channelCount?: number; // Physical mixer channels (2, 3, 4, or 6). Overrides derived count when deck count differs from channel count (e.g., XDJ-XZ: 4 decks, 2 channels)
  deviceType?: "controller" | "mixer" | "player" | "pad" | "other"; // From MIDI map JSON
  controls: ControlMapping[];
}

// ============================================================================
// Standardized Controller State
// ============================================================================

export interface DeckState {
  // Faders - NORMALIZED 0.0-1.0 (0=silent, 1=full)
  channelFader: number;

  // EQ - NORMALIZED -1.0 to 1.0 (-1=full cut, 0=unity, +1=full boost)
  eqHigh: number;
  eqMid: number;
  eqLow: number;

  // Filter - NORMALIZED -1.0 to 1.0 (-1=LPF, 0=off/center, +1=HPF)
  filter: number;
  filterMode: "normal" | "lpf" | "hpf"; // Active filter mode

  // Trim/Gain - NORMALIZED 0.0-1.0 (0=silent, 0.5=unity, 1=full)
  trim: number;

  // Tempo/Pitch - NORMALIZED 0.0-1.0 (0=-100%, 0.5=0%, 1=+100%)
  tempo: number;

  // Transport state
  playing: boolean;
  cueActive: boolean;
  syncActive: boolean;
  master: boolean; // Is this deck the sync master?

  // Loop state
  loopActive: boolean;
  loopBeats?: number; // e.g., 0.5, 1, 2, 4, 8

  // Key lock
  keyLock: boolean;

  // Jog wheel
  jogTouching: boolean;

  /**
   * Hardware on-air flag, when the rig has a mixer that reports one (a DJM on
   * the Pro DJ Link network, an Opus Quad). Authoritative for audibility where
   * it is present — the mixer has already weighed fader, crossfader and its own
   * on-air setting — so `is_in_mix` short-circuits on it. Absent means "this
   * rig cannot say", which is not the same as off-air.
   */
  isOnAir?: boolean;

  /** Raw jog-turn MIDI value; encoding depends on the controller mapping. */
  jogValue?: number;
  /** Number of mapped jog-turn messages received since reset. */
  jogSequence?: number;
  playPressCount?: number;
  cuePressCount?: number;
  loopInPressed?: boolean;
  loopInCount?: number;
  loopOutPressed?: boolean;
  loopOutCount?: number;
  loopHalfPressed?: boolean;
  loopHalfCount?: number;
  loopDoublePressed?: boolean;
  loopDoubleCount?: number;

  // Event timestamps for reliable play state detection
  // Used to determine if play was pressed after cue release (definitively playing)
  cueReleasedAt?: number; // Timestamp when cue was last released
  playPressedAt?: number; // Timestamp when play was last pressed
}

/**
 * Standardized state of a DJ controller.
 *
 * This represents the current state of all controls on the controller,
 * normalized to a common format regardless of the specific controller
 * model or MIDI mapping used.
 *
 * All values are NORMALIZED:
 * - Linear signals (faders, EQ, trim): 0.0 - 1.0
 * - Bipolar signals (crossfader, filter): -1.0 to 1.0
 * - Buttons/toggles: booleans
 */
export interface ControllerState {
  // Per-deck state
  deck1: DeckState;
  deck2: DeckState;
  deck3?: DeckState; // Only for 4-deck and 6-deck controllers
  deck4?: DeckState; // Only for 4-deck and 6-deck controllers
  deck5?: DeckState; // Only for 6-deck controllers
  deck6?: DeckState; // Only for 6-deck controllers

  // Mixer controls - NORMALIZED
  crossfader: number; // -1.0=left/A, 0=center, +1.0=right/B
  masterVolume: number; // 0.0-1.0
  headphoneMix: number; // -1.0 to 1.0
  headphoneVolume: number; // 0.0-1.0

  // Metadata
  controllerName?: string;
  lastUpdateMs: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createDefaultDeckState(): DeckState {
  return {
    channelFader: 0.0, // Silent
    eqHigh: 0.0, // Unity (bipolar: -1=cut, 0=unity, +1=boost)
    eqMid: 0.0, // Unity
    eqLow: 0.0, // Unity
    filter: 0.0, // Center/off
    filterMode: "normal", // No filter active
    trim: 0.5, // Unity
    tempo: 0, // Center (0%)
    playing: false,
    cueActive: false,
    syncActive: false,
    master: false,
    loopActive: false,
    keyLock: false,
    jogTouching: false,
  };
}

export function createDefaultControllerState(): ControllerState {
  return {
    deck1: createDefaultDeckState(),
    deck2: createDefaultDeckState(),
    crossfader: 0.0, // Center
    masterVolume: 1.0, // Full
    headphoneMix: 0.0, // Center
    headphoneVolume: 1.0, // Full
    lastUpdateMs: 0,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get deck state by number (1-6)
 */
export function getDeck(
  state: ControllerState,
  deckNumber: number,
): DeckState | undefined {
  switch (deckNumber) {
    case 1:
      return state.deck1;
    case 2:
      return state.deck2;
    case 3:
      return state.deck3;
    case 4:
      return state.deck4;
    case 5:
      return state.deck5;
    case 6:
      return state.deck6;
    default:
      return undefined;
  }
}

/**
 * Determine if a deck is likely audible based on fader positions.
 *
 * This uses a simple heuristic:
 * - Channel fader must be above threshold
 * - Crossfader must be in a position that allows this deck to be heard
 *
 * @param state - Controller state (with normalized values)
 * @param deckNumber - Deck number (1-6)
 * @param faderThreshold - Minimum fader level (0.0-1.0), default 0.08 (~10/127)
 */
export function isDeckAudible(
  state: ControllerState,
  deckNumber: number,
  faderThreshold = 0.08,
): boolean {
  const deck = getDeck(state, deckNumber);
  if (!deck) return false;

  // Channel fader must be up
  if (deck.channelFader < faderThreshold) return false;

  // Check crossfader position (-1.0 to 1.0)
  // For 2-deck: deck 1 = left (A), deck 2 = right (B)
  // For 4-deck: decks 1,3 = left (A), decks 2,4 = right (B)
  // For 6-deck: decks 1,3,5 = left (A), decks 2,4,6 = right (B)
  const isLeftDeck = deckNumber % 2 === 1;

  if (isLeftDeck) {
    // Left deck audible when crossfader is not fully right
    return state.crossfader < 0.92; // ~117/127 → 0.92
  } else {
    // Right deck audible when crossfader is not fully left
    return state.crossfader > -0.92; // ~10/127 → -0.92
  }
}
