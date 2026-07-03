import type { ComponentType } from "react";
import type { EnrichedTrack } from "../types";
import { Clean } from "../themes/clean";
import { Asot2K3 } from "../themes/asot-2k3";
import { Kinetik3D } from "../themes/kinetik-3d";
import { Sideways } from "../themes/sideways";

/**
 * Theme registry used by the bundle build.
 *
 * Each entry maps a theme id (declared in `bundle.config.json`) to the React
 * component that should render it inside the bundled iframe overlay. To ship
 * a new theme to end users, add it here AND to `bundle.config.json`.
 */

export interface BundledThemeProps {
  track: EnrichedTrack | null;
  [key: string]: unknown;
}

export const BUNDLED_THEMES: Record<string, ComponentType<BundledThemeProps>> = {
  clean: Clean as ComponentType<BundledThemeProps>,
  "asot-2k3": Asot2K3 as ComponentType<BundledThemeProps>,
  "kinetik-3d": Kinetik3D as ComponentType<BundledThemeProps>,
  sideways: Sideways as ComponentType<BundledThemeProps>,
};
