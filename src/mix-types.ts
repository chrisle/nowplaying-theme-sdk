/* eslint-disable */
/**
 * AUTO-GENERATED FILE - DO NOT EDIT!
 * Generated from: schemas/mix-processor.schema.json
 * Run: cd schemas && npm run generate
 */

export type DJStyleType =
  | "open_format"
  | "house_techno"
  | "bass_dub"
  | "hip_hop_rnb"
  | "trance"
  | "drum_and_bass"
  | "hardstyle"
  | "custom";

export type WeightLabel = "strong" | "medium" | "weak" | "off";

export interface CrossfaderState {
  /**
   * Crossfader position (-1=A/left, 0=center, 1=B/right)
   */
  position: number;
  /**
   * Channels assigned to crossfader side A (e.g., [1, 3])
   */
  assignmentA: number[];
  /**
   * Channels assigned to crossfader side B (e.g., [2, 4])
   */
  assignmentB: number[];
}

export interface MixerState {
  /**
   * Source ID of the hardware mixer/controller
   */
  sourceId: string;
  /**
   * User ID this mixer belongs to
   */
  userId: string;
  crossfader: CrossfaderState;
}

export interface ConnectedDevice {
  /**
   * Type of device
   */
  type: "cdj" | "xdj" | "controller" | "software";
  /**
   * Human-readable device name (e.g., 'XDJ-XZ', 'DDJ-FLX4', 'CDJ-3000')
   */
  name?: string;
  /**
   * Source ID providing the device data (e.g., 'prodjlink', 'midi')
   */
  sourceId: string;
  /**
   * Unique deck identifier (e.g., 'prodjlink:2', 'midi:1')
   */
  deckId: string;
  /**
   * Physical device number if applicable (e.g., CDJ 2)
   */
  deviceNumber?: number;
}

export interface Track {
  /**
   * Track ID
   */
  id?: string;
  /**
   * Artist name
   */
  artist: string;
  /**
   * Track title
   */
  title: string;
  /**
   * Album name
   */
  album?: string;
  /**
   * URL to track artwork
   */
  artworkUrl?: string;
  [k: string]: unknown;
}

export interface ChannelSignals {
  /**
   * Channel fader position (0=closed, 1=full)
   */
  channelFader: number;
  /**
   * Low EQ knob position (-1=full cut, 0=unity, 1=full boost)
   */
  eqLow: number;
  /**
   * Mid EQ knob position (-1=full cut, 0=unity, 1=full boost)
   */
  eqMid: number;
  /**
   * High EQ knob position (-1=full cut, 0=unity, 1=full boost)
   */
  eqHigh: number;
  /**
   * Whether the deck is currently playing
   */
  playing: boolean;
  /**
   * Whether the cue button is pressed (monitoring in headphones)
   */
  cueActive: boolean;
  /**
   * Whether DJ is touching the jog wheel
   */
  jogTouching: boolean;
  /**
   * Whether this deck is the sync/tempo master
   */
  master: boolean;
  /**
   * DJM mixer's hardware on-air indicator (if available)
   */
  isOnAir?: boolean;
  /**
   * Whether the deck is looping
   */
  looping?: boolean;
  /**
   * Jog wheel mode
   */
  jogMode?: "vinyl" | "cdj";
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
  trim?: number;
}

export interface SignalContributions {
  /**
   * Contribution from channel fader
   */
  channelFader: number;
  /**
   * Contribution from crossfader position
   */
  crossfader: number;
  /**
   * Contribution from playing state
   */
  playing: number;
  /**
   * Contribution from low EQ
   */
  eqLow: number;
  /**
   * Contribution from mid EQ
   */
  eqMid: number;
  /**
   * Contribution from high EQ
   */
  eqHigh: number;
  /**
   * Contribution from jog wheel interaction
   */
  jogTouching: number;
  /**
   * Contribution from tempo master status
   */
  master: number;
  /**
   * Contribution from hardware on-air indicator
   */
  isOnAir?: number;
  /**
   * Contribution from filter knob
   */
  filter?: number;
  /**
   * Contribution from trim/gain knob
   */
  trim?: number;
}

export interface ChannelScore {
  /**
   * Normalized score (0.0-1.0) for easy comparison
   */
  normalizedScore: number;
  /**
   * Raw weighted score before normalization
   */
  rawScore: number;
  /**
   * Sum of all weights applied to this channel
   */
  totalWeight: number;
  contributions: SignalContributions;
  /**
   * If set, the normalized score was pinned to 0 for this reason.
   */
  scorePinnedAt?: "fader_down" | "not_playing";
}

export interface ChannelState {
  /**
   * Physical mixer channel number (1-6)
   */
  channelNumber: number;
  /**
   * Connected device (null if no device connected)
   */
  device: ConnectedDevice | null;
  /**
   * Track loaded on this channel (null if no track)
   */
  track: Track | null;
  signals: ChannelSignals;
  score: ChannelScore;
}

export interface OnAirState {
  /**
   * Currently on-air channel
   */
  currentOnAir: {
    /**
     * Mixer channel number (1-6) currently on-air, null if none
     */
    channelNumber: number | null;
    /**
     * Deck ID for legacy compatibility (e.g., 'midi:1')
     */
    deckId: string | null;
  };
  /**
   * Pending winner during debounce period
   */
  pendingWinner: {
    /**
     * Channel number of pending winner, null if no pending change
     */
    channelNumber: number | null;
    /**
     * Deck ID of pending winner for legacy compatibility
     */
    deckId: string | null;
    /**
     * Timestamp (ms since epoch) when debounce started, null if no pending change
     */
    debounceStartedAt: number | null;
    /**
     * Configured debounce duration in milliseconds
     */
    debounceMs: number;
  };
}

export interface SignalWeights {
  /**
   * Weight for channel fader signal (default: 0.25)
   */
  channelFader: number;
  /**
   * Weight for crossfader signal (default: 0.05)
   */
  crossfader: number;
  /**
   * Weight for playing state signal (default: 0.20)
   */
  playing: number;
  /**
   * Weight for low EQ signal (default: 0.05)
   */
  eqLow: number;
  /**
   * Weight for mid EQ signal (default: 0.03)
   */
  eqMid: number;
  /**
   * Weight for high EQ signal (default: 0.02)
   */
  eqHigh: number;
  /**
   * Weight for jog touching signal (default: 0.02)
   */
  jogTouching: number;
  /**
   * Weight for tempo master signal (default: 0.15)
   */
  master: number;
  /**
   * Weight for hardware on-air indicator (default: 0.20)
   */
  isOnAir: number;
  /**
   * Weight for filter knob signal (default: 0.03)
   */
  filter: number;
}

export interface Thresholds {
  /**
   * Minimum fader value to be considered audible (default: 0.08)
   */
  faderMinimum: number;
  /**
   * EQ values below this are considered 'cut' (default: -0.5, where -1=full cut)
   */
  eqCutThreshold: number;
  /**
   * Dead zone around center for bipolar controls (crossfader, EQ, tempo). Values within this range of 0 are snapped to exactly 0. (default: 0.05)
   */
  centerTolerance?: number;
  /**
   * Minimum normalized score to be considered for on-air (default: 0.3)
   */
  scoreMinimum: number;
  /**
   * Dead zone around crossfader center. Values within ±this range snap to 0 (default: 0.15)
   */
  crossfaderDeadZone: number;
}

export interface MixProcessorConfig {
  /**
   * Active DJ mixing style preset
   */
  djStyle:
    | "open_format"
    | "house_techno"
    | "bass_dub"
    | "hip_hop_rnb"
    | "trance"
    | "drum_and_bass"
    | "hardstyle"
    | "custom";
  /**
   * Debounce duration in milliseconds before switching on-air track
   */
  debounceMs: number;
  weights: SignalWeights;
  thresholds: Thresholds;
}

export interface MixProcessorState {
  mixer: MixerState;
  /**
   * Array of mixer channels (1-6)
   *
   * @minItems 1
   * @maxItems 6
   */
  channels:
    | [ChannelState]
    | [ChannelState, ChannelState]
    | [ChannelState, ChannelState, ChannelState]
    | [ChannelState, ChannelState, ChannelState, ChannelState]
    | [ChannelState, ChannelState, ChannelState, ChannelState, ChannelState]
    | [
        ChannelState,
        ChannelState,
        ChannelState,
        ChannelState,
        ChannelState,
        ChannelState,
      ];
  onAir: OnAirState;
  config: MixProcessorConfig;
  /**
   * ISO timestamp of last state update, null if never updated
   */
  lastUpdateAt: string | null;
}
