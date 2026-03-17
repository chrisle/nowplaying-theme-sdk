# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Type-check + build for production
npm run preview  # Preview production build
```

No test runner is configured.

## Architecture

This is a standalone Vite + React + TypeScript dev environment for building overlay themes for the [Now Playing](https://nowplayingapp.com) app. Themes built here are eventually copied into the main monorepo.

### Theme anatomy

Each theme lives in `src/themes/<kebab-name>.tsx` and exports two components:

1. **Inner component** (e.g. `CleanContent`) — receives `ThemeRenderProps & CustomProps`, handles animations using Framer Motion's `useAnimation()`, and responds to the `isAnimating` flag.
2. **Outer component** (e.g. `Clean`) — the public export. Accepts `{ track: EnrichedTrack | null, ...customProps }` and wraps the inner component with `<BaseOverlay>`.

### Animation lifecycle

`BaseOverlay` (`src/components/base-overlay.tsx`) manages track transitions:
1. New track arrives → `isAnimating = true`
2. Exit animation plays for `exitDuration` ms
3. Track data swaps to new track
4. Enter animation plays for `enterDuration` ms
5. `isAnimating = false`

The inner component's `useEffect` watches `isAnimating`: `true` → run exit then enter sequence; `false` → snap to rest position. Set `animationTiming` on `<BaseOverlay>` to match actual animation durations.

### Registering a theme

Two places in `src/App.tsx` must be updated:

- **`THEMES` array** (~line 86): add `{ id, name, Component }` entry
- **`THEME_FIELDS` record** (~line 21): add customization field definitions keyed by theme id

Available field types: `"color"`, `"boolean"`, `"number"`, `"string"`, `"range"`. Dot notation in `key` (e.g. `"fontSize.title"`) is resolved into nested objects by `resolveOptions()`.

### Key files

| File | Purpose |
|------|---------|
| `src/components/base-overlay.tsx` | `BaseOverlay` wrapper + `ThemeRenderProps` interface |
| `src/components/album-art.tsx` | `AlbumArt` component (sizes: `sm`, `md`, `lg`, `xl`) |
| `src/types.ts` | Standalone copy of `EnrichedTrack` (subset of monorepo type) |
| `src/mock-data.ts` | Mock tracks used by dev harness |
| `src/themes/clean.tsx` | Canonical/simplest theme example |

### Submitting a theme to the main project

1. Add `"use client";` as the first line
2. Update imports: `../types` → `@nowplaying/shared/types`, `../components/base-overlay` → `./base-overlay`, `../components/album-art` → `@/components/ui/album-art`
3. Copy theme file to `apps/web/src/components/overlays/`
4. Register in `apps/web/src/components/overlays/index.ts`

## Skill

Use `/create-theme` to scaffold a new theme interactively.
