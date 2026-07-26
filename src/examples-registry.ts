/// <reference types="vite/client" />
import { buildRegistry } from "./discover";
import type { Theme } from "./theme";

/**
 * The worked examples this kit ships (`src/examples/`).
 *
 * Examples are for reading and copying, so they are deliberately kept out of
 * `src/themes/`: the playground shows them, the `.np3theme` build never
 * packages them, and `npm run upgrade` replaces them wholesale. To make one
 * yours, copy it into `src/themes/` and give it your own `meta.id`.
 */
export const EXAMPLE_THEMES: Theme[] = buildRegistry({
  ...import.meta.glob("./examples/*.tsx", { eager: true }),
  ...import.meta.glob("./examples/*/index.tsx", { eager: true }),
});
