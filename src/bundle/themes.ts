import type { ComponentType } from "react";
import type { EnrichedTrack } from "../types";
import { Clean } from "../themes/clean";

/**
 * Theme registry used by the bundle build.
 *
 * Each entry maps a theme id (declared in `bundle.config.json`) to the React
 * component that should render it inside the bundled iframe overlay. To ship a
 * new theme, add it here AND to `bundle.config.json`, then run `npm run build`.
 */

export interface BundledThemeProps {
  track: EnrichedTrack | null;
  [key: string]: unknown;
}

export const BUNDLED_THEMES: Record<
  string,
  ComponentType<BundledThemeProps>
> = {
  clean: Clean as ComponentType<BundledThemeProps>,
};
