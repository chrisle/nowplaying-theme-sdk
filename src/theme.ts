import type {
  ThemeEvent,
  ThemeControllerSnapshot,
  MixProcessorState,
} from "./events";
import type { ComponentType } from "react";
import type { EnrichedTrack } from "./types";

/**
 * The theme authoring contract.
 *
 * A theme is one file in `src/themes/` (or `src/themes/<name>/index.tsx`) that
 * exports two things:
 *
 *   export const meta: ThemeMeta = { id, name, ... }
 *   export default function MyTheme(props: ThemeProps) { ... }
 *
 * Nothing else needs to know about it — the playground and the `.np3theme`
 * build both discover themes by scanning that folder, so adding a theme never
 * means editing a file the SDK owns (and upgrades never conflict with yours).
 */

export type ThemeFieldType =
  | "color"
  | "boolean"
  | "number"
  | "string"
  | "range";

/**
 * One editable control in the playground sidebar. The `key` becomes the prop
 * handed to your component; dotted keys nest (`"fontSize.title"` arrives as
 * `fontSize: { title }`).
 */
export interface ThemeField {
  key: string;
  label: string;
  type: ThemeFieldType;
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface ThemeMeta {
  /** Stable id: lowercase alphanumeric with `-` or `_`, max 64 chars. */
  id: string;
  /** Display name shown in the playground and the Now Playing theme picker. */
  name: string;
  /** Short tagline shown under the name in the picker. */
  description?: string;
  /** Overlay dimensions in pixels, used to size the browser source in OBS. */
  width?: number;
  height?: number;
  /** Controls rendered in the playground sidebar, passed to your component. */
  fields?: ThemeField[];
  /** Additional typed data feeds. Omitted: track and mix for legacy themes. */
  events?: ThemeEvent[];
}

export interface ThemeProps {
  track: EnrichedTrack | null;
  mixState?: MixProcessorState | null;
  controller?: ThemeControllerSnapshot | null;
  connected?: boolean;
  [key: string]: unknown;
}

export type ThemeComponent = ComponentType<ThemeProps>;

/** A discovered theme: its metadata, its component, and where it came from. */
export interface Theme {
  meta: ThemeMeta;
  Component: ThemeComponent;
  /** Source module path, used in error messages. */
  source: string;
}
