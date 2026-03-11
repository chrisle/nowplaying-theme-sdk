/**
 * Minimal EnrichedTrack type for overlay themes.
 *
 * This is a standalone copy of the fields overlays actually use.
 * The full type lives in the main project at packages/shared/src/types/generated/track.ts
 */
export interface EnrichedTrack {
  /** Unique identifier */
  id: string;
  /** Artist name */
  artist: string;
  /** Track title */
  title: string;
  /** Album name */
  album?: string;
  /** Record label */
  label?: string;
  /** Music genre */
  genre?: string;
  /** Beats per minute */
  bpm?: number;
  /** Musical key */
  key?: string;
  /** Artwork URL */
  artworkUrl?: string;
  /** Small artwork URL */
  artworkUrlSmall?: string;
  /** Unique signature for deduplication */
  signature: string;
  /** Track source identifier */
  source: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** ISO 8601 timestamp when track was enriched */
  enrichedAt: string;
}
