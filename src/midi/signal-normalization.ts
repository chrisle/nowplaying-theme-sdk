/**
 * Signal Normalization Utilities
 *
 * Converts hardware-specific values to normalized ranges for the mix processor:
 * - Linear signals (faders, EQ, trim): 0.0 - 1.0
 * - Bipolar signals (crossfader, filter): -1.0 - 1.0
 * - Boolean signals: 0.0 or 1.0
 *
 * These utilities should be used at the source (MIDI processor, StageLinQ, etc.)
 * so the mix processor receives already-normalized values.
 */

/**
 * Convert MIDI CC value (0-127) to normalized linear range (0.0-1.0).
 *
 * Use for: channel_fader, eq_low/mid/high, trim, tempo, master_volume
 *
 * @param midiValue - Raw MIDI CC value (0-127)
 * @returns Normalized value (0.0-1.0)
 *
 * @example
 * normalizeLinear(0)   // => 0.0 (silent/cut)
 * normalizeLinear(64)  // => ~0.5 (unity)
 * normalizeLinear(127) // => 1.0 (full)
 */
export function normalizeLinear(midiValue: number): number {
  return Math.max(0, Math.min(1, midiValue / 127));
}

/**
 * Convert MIDI CC value (0-127, 64=center) to normalized bipolar range (-1.0 to 1.0).
 *
 * Use for: crossfader, filter
 *
 * @param midiValue - Raw MIDI CC value (0-127, where 64 is center)
 * @returns Normalized value (-1.0 to 1.0)
 *
 * @example
 * normalizeBipolar(0)   // => -1.0 (full left/LPF)
 * normalizeBipolar(64)  // => 0.0 (center/off)
 * normalizeBipolar(127) // => ~0.98 (full right/HPF)
 */
export function normalizeBipolar(midiValue: number): number {
  return Math.max(-1, Math.min(1, (midiValue - 64) / 64));
}

/**
 * Clamp a value that should already be normalized to 0.0-1.0 range.
 *
 * Use when receiving values from sources that provide pre-normalized data
 * (like StageLinQ) but may occasionally exceed bounds.
 *
 * @param value - Value that should be 0.0-1.0
 * @returns Clamped value (0.0-1.0)
 */
export function clampLinear(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Clamp a value that should already be normalized to -1.0 to 1.0 range.
 *
 * Use when receiving values from sources that provide pre-normalized data
 * but may occasionally exceed bounds.
 *
 * @param value - Value that should be -1.0 to 1.0
 * @returns Clamped value (-1.0 to 1.0)
 */
export function clampBipolar(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
