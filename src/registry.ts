/// <reference types="vite/client" />
import { buildRegistry } from "./discover";
import type { Theme } from "./theme";

/**
 * Your themes — every file in `src/themes/`.
 *
 * This is the only folder the `.np3theme` build packages, and the only folder
 * `npm run upgrade` leaves alone. Drop a theme file in, it shows up here; no
 * registration step, no SDK file to edit.
 */
export const USER_THEMES: Theme[] = buildRegistry({
  ...import.meta.glob("./themes/*.tsx", { eager: true }),
  ...import.meta.glob("./themes/*/index.tsx", { eager: true }),
});
