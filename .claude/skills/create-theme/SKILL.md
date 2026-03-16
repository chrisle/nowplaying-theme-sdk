---
name: create-theme
description: Create a new Now Playing overlay theme. Use when asked to create, scaffold, or add a new theme to the theme SDK.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Create a New Theme

Scaffold a complete overlay theme for the Now Playing theme SDK.

## Architecture Overview

Each theme consists of two components in a single file:

1. **Inner component** (e.g. `NeonTheme`) — handles animations and rendering. Receives `ThemeRenderProps & CustomProps`. Uses Framer Motion `useAnimation()` to animate elements on track changes.

2. **Outer component** (e.g. `Neon`) — the public export. Receives `{ track, ...customProps }`. Wraps the inner component with `BaseOverlay` which manages the track change lifecycle.

### Animation Lifecycle

`BaseOverlay` manages track transitions by toggling `isAnimating`:

1. New track arrives → `isAnimating` set to `true`
2. Inner component runs **exit animation** (move elements off-screen)
3. After `exitDuration` ms, BaseOverlay swaps the track data
4. Inner component runs **enter animation** (move elements back on-screen)
5. After `enterDuration` ms, `isAnimating` set to `false`

The inner component's `useEffect` watches `isAnimating`:
- When `isAnimating` becomes `true` → run exit then enter sequence
- When `isAnimating` becomes `false` → snap elements to resting position

## Workflow

### Step 1: Get Theme Details

Ask the user for:
- **Theme name** (e.g. "Neon", "Minimal", "Retro")
- **Brief description** of the visual style or animation concept
- **Custom properties** they want exposed (colors, sizes, toggles, etc.)

### Step 2: Create the Theme File

Create `src/themes/<kebab-name>.tsx` using the template in [template.md](template.md).

Key points:
- Import `EnrichedTrack` from `../types`
- Import `motion, useAnimation` from `framer-motion`
- Import `useEffect` from `react`
- Import `BaseOverlay, ThemeRenderProps` from `../components/base-overlay`
- Optionally import `AlbumArt` from `../components/album-art`
- Inner component signature: `ThemeRenderProps & <Name>ThemeProps`
- Outer component signature: `{ track: EnrichedTrack | null; ...customProps }`
- Set `animationTiming` on BaseOverlay to match the theme's actual animation durations (exit + enter + any stagger delays, in milliseconds)

### Step 3: Register in App.tsx

Edit `src/App.tsx`:

1. **Add import** at the top with other theme imports:
   ```typescript
   import { ThemeName } from "./themes/<kebab-name>";
   ```

2. **Add to THEMES array** (around line 87):
   ```typescript
   { id: "<kebab-name>", name: "<Display Name>", Component: ThemeName },
   ```

3. **Add to THEME_FIELDS** (around line 21) with customization field definitions:
   ```typescript
   "<kebab-name>": [
     { key: "propName", label: "Display Label", type: "color", defaultValue: "#ff0000" },
     // ... more fields
   ],
   ```

   Available field types:
   - `"color"` — hex color picker, defaultValue is a hex string
   - `"boolean"` — checkbox toggle, defaultValue is true/false
   - `"number"` — numeric input, defaultValue is a number; supports min, max, step
   - `"string"` — text input, defaultValue is a string
   - `"range"` — slider input, defaultValue is a number; requires min, max, step

   For nested props (e.g. `fontSize.title`), use dot notation in the key. These are automatically resolved into nested objects by the playground.

### Step 4: Verify

- Confirm the theme file exports the outer component
- Confirm App.tsx imports and registers both the component and its fields
- Confirm `animationTiming` values match the actual animation durations

## Reference Files

| File | Purpose |
|------|---------|
| `src/components/base-overlay.tsx` | BaseOverlay wrapper and ThemeRenderProps interface |
| `src/types.ts` | EnrichedTrack type definition |
| `src/themes/clean.tsx` | Canonical theme example (simplest pattern) |
| `src/App.tsx` | THEMES registry and THEME_FIELDS customization |
| `src/components/album-art.tsx` | Optional AlbumArt component (sizes: sm, md, lg, xl) |

## ThemeRenderProps

```typescript
interface ThemeRenderProps {
  title: string;
  artist: string;
  label?: string;
  artwork?: string;
  isAnimating: boolean;
}
```

## Important

- Use Tailwind CSS for styling (already configured in the SDK)
- Use Framer Motion for all animations (already a dependency)
- The `isAnimating` flag drives the entire animation — do not use separate timers
- Keep animations performant (prefer transform/opacity over layout-triggering properties)
- The outer component must pass all custom props through to the inner component via `renderTheme`
