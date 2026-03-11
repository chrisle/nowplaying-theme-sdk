# Now Playing Theme SDK

A standalone development environment for creating overlay themes for [Now Playing](https://nowplayingapp.com).

## Getting Started

```bash
cd apps/nowplaying-theme-sdk
npm install
npm run dev
```

Open the URL shown in your terminal. You'll see the Clean theme rendering mock track data on a checkered background. Click **Next Track** to cycle through tracks and trigger the exit/enter animation cycle.

## Creating a New Theme

### 1. Create your theme file

Create a new file in `src/themes/`, e.g. `src/themes/my-theme.tsx`:

```tsx
import { EnrichedTrack } from "../types";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";

function MyThemeContent({ title, artist, label, artwork, isAnimating }: ThemeRenderProps) {
  return (
    <div style={{ opacity: isAnimating ? 0 : 1, transition: "opacity 0.5s" }}>
      <h1>{title}</h1>
      <h2>{artist}</h2>
      {label && <p>{label}</p>}
    </div>
  );
}

interface MyThemeProps {
  track: EnrichedTrack | null;
}

export function MyTheme({ track }: MyThemeProps) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: 500, enterDuration: 500 }}
      renderTheme={(props) => <MyThemeContent {...props} />}
    />
  );
}
```

### 2. Register it in the dev harness

Open `src/App.tsx` and add your theme to the `THEMES` array:

```tsx
import { MyTheme } from "./themes/my-theme";

const THEMES = [
  { id: "clean", name: "Clean", Component: Clean },
  { id: "my-theme", name: "My Theme", Component: MyTheme },
] as const;
```

Select it from the dropdown to preview.

## Props Reference

### `ThemeRenderProps`

Your theme's render function receives these props:

| Prop          | Type      | Description                                              |
| ------------- | --------- | -------------------------------------------------------- |
| `title`       | `string`  | Track title                                              |
| `artist`      | `string`  | Artist name                                              |
| `label`       | `string?` | Record label (may be undefined)                          |
| `artwork`     | `string?` | Artwork URL (may be undefined)                           |
| `isAnimating` | `boolean` | `true` during exit/enter animation cycle, `false` at rest |

### Animation Lifecycle

When a new track arrives, `BaseOverlay` runs this cycle:

1. `isAnimating` becomes `true`
2. **Exit phase** — your theme animates the old track out (duration: `exitDuration` ms)
3. Track data updates to the new track
4. **Enter phase** — your theme animates the new track in (duration: `enterDuration` ms)
5. `isAnimating` becomes `false`

Use `isAnimating` to trigger your CSS/Framer Motion animations.

### `BaseOverlay` Props

| Prop              | Type     | Description                                |
| ----------------- | -------- | ------------------------------------------ |
| `track`           | `EnrichedTrack \| null` | Current track (null = waiting) |
| `renderTheme`     | `(props: ThemeRenderProps) => ReactNode` | Your theme renderer |
| `animationTiming` | `{ exitDuration: number, enterDuration: number }` | Timing in ms (default: 1500/1500) |

## Available Utilities

- **`AlbumArt`** — Album artwork component with loading states, error fallback (music note icon), and size variants (`sm`, `md`, `lg`, `xl`)
- **`BaseOverlay`** — Handles track change detection, animation lifecycle, and prop mapping

## Submitting a Theme

When your theme is ready to be added to the main Now Playing project:

1. Add `"use client";` as the first line of your theme file (required by Next.js)
2. Update imports:
   - `../types` → `@nowplaying/shared/types`
   - `../components/base-overlay` → `./base-overlay`
   - `../components/album-art` → `@/components/ui/album-art`
3. Copy your theme file into `apps/web/src/components/overlays/`
4. Register it in `apps/web/src/components/overlays/index.ts`
