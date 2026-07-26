# Now Playing Theme SDK

A self-contained kit for building overlay themes for
[Now Playing](https://nowplayingapp.com).

Develop and preview your theme locally against mock track data, then click
**Download .np3theme** (or run one command) to produce the file you upload from
the Now Playing dashboard.

## Getting Started

```bash
npm install
npm run dev
```

Open the URL shown in your terminal. You'll see the **Clean** theme — the worked
example this kit ships with — rendering mock track data on a checkered
background. Click **Next Track** to cycle through tracks and trigger the
exit/enter animation cycle.

The theme picker groups **your themes** (`src/themes/`) separately from the
kit's **examples** (`src/examples/`), which are never packaged.

## The workflow

| Command             | What it does                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`       | Local preview with mock tracks, live-editable theme options, and a **Download .np3theme** button |
| `npm run build`     | Typechecks, then produces the uploadable `.np3theme` in `dist-bundle/`                           |
| `npm run typecheck` | Typecheck only                                                                                   |
| `npm run upgrade`   | Pull the latest SDK into this clone without touching your themes                                 |

`src/examples/clean.tsx` is a complete, shipping-quality theme — copy it into
`src/themes/` as the starting point for your own.

## What's yours, what's ours

| Yours                | Ours (everything else)                            |
| -------------------- | ------------------------------------------------- |
| `src/themes/**`      | `src/components/`, `src/examples/`, `src/bundle/` |
| `bundle.config.json` | `src/App.tsx`, `scripts/`, configs, `README.md`   |

Themes are **discovered, not registered**: anything in `src/themes/` shows up in
the playground and gets packaged, with no list to update anywhere. That is what
makes `npm run upgrade` safe — the SDK can replace its own half outright,
because you never had to edit it.

Two consequences worth knowing:

- `src/examples/` is ours, so nothing in it is ever packaged into a `.np3theme`.
  Copy an example into `src/themes/` to make it yours.
- Keep your work inside `src/themes/`. A file you add to one of our folders is
  removed on the next upgrade.

## Upgrading the SDK

```bash
npm run upgrade              # pull the latest SDK into this clone
npm run upgrade -- --dry-run # see what would change first
```

It fetches the repo you cloned from (or `--repo <url>`, or `--ref <tag>`),
replaces our files, and reports what changed. Your themes and
`bundle.config.json` are never read or written. `package.json` is merged:
upstream's scripts and toolchain land, dependencies you added stay — run
`npm install` afterwards if it tells you dependencies changed.

Uncommitted edits to SDK files stop the upgrade so nothing of yours is lost;
`--force` overrides that.

## Creating a New Theme

Copy `src/examples/clean.tsx` into `src/themes/`, or start from scratch. A theme
is one file that exports two things — its `meta` and its component:

```tsx
import { EnrichedTrack } from "../types";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";
import type { ThemeMeta } from "../theme";

/** Everything the playground and the bundle build need to know. */
export const meta: ThemeMeta = {
  id: "my-theme", // unique, lowercase, [a-z0-9_-]
  name: "My Theme", // shown in the picker
  description: "A short tagline shown in the picker",
  width: 1280,
  height: 200,
  fields: [
    {
      key: "textColor",
      label: "Text Color",
      type: "color",
      defaultValue: "#ffffff",
    },
  ],
};

function MyThemeContent({
  title,
  artist,
  label,
  isAnimating,
  textColor,
}: ThemeRenderProps & { textColor?: string }) {
  return (
    <div
      style={{
        color: textColor,
        opacity: isAnimating ? 0 : 1,
        transition: "opacity 0.5s",
      }}
    >
      <h1>{title}</h1>
      <h2>{artist}</h2>
      {label && <p>{label}</p>}
    </div>
  );
}

export default function MyTheme({
  track,
  textColor,
}: {
  track: EnrichedTrack | null;
  textColor?: string;
}) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: 500, enterDuration: 500 }}
      renderTheme={(props) => (
        <MyThemeContent {...props} textColor={textColor} />
      )}
    />
  );
}
```

That's the whole registration. Save the file and it appears in the playground
picker; `npm run build` packages it. A theme can also be a folder
(`src/themes/my-theme/index.tsx`) if it needs its own assets alongside it.

### Theme metadata (`meta`)

| Key           | Required | Description                                              |
| ------------- | -------- | -------------------------------------------------------- |
| `id`          | yes      | Unique id, lowercase alphanumeric with `-`/`_`           |
| `name`        | yes      | Display name in the playground and Now Playing picker    |
| `description` | no       | Tagline shown under the name                             |
| `width`       | no       | Overlay width in px, used to size the OBS browser source |
| `height`      | no       | Overlay height in px                                     |
| `fields`      | no       | Editable controls, passed to your component as props     |

Each field is `{ key, label, type, defaultValue }` plus `min`/`max`/`step` for
numeric types. Types: `color`, `boolean`, `number`, `string`, `range`. Dotted
keys nest — `"fontSize.title"` reaches your component as
`fontSize: { title: ... }`.

## Props Reference

### `ThemeRenderProps`

Your theme's render function receives these props:

| Prop          | Type      | Description                                               |
| ------------- | --------- | --------------------------------------------------------- |
| `title`       | `string`  | Track title                                               |
| `artist`      | `string`  | Artist name                                               |
| `label`       | `string?` | Record label (may be undefined)                           |
| `artwork`     | `string?` | Artwork URL (may be undefined)                            |
| `isAnimating` | `boolean` | `true` during exit/enter animation cycle, `false` at rest |

### Animation Lifecycle

When a new track arrives, `BaseOverlay` runs this cycle:

1. `isAnimating` becomes `true`
2. **Exit phase** — your theme animates the old track out (duration:
   `exitDuration` ms)
3. Track data updates to the new track
4. **Enter phase** — your theme animates the new track in (duration:
   `enterDuration` ms)
5. `isAnimating` becomes `false`

Use `isAnimating` to trigger your CSS/Framer Motion animations.

### `BaseOverlay` Props

| Prop              | Type                                              | Description                       |
| ----------------- | ------------------------------------------------- | --------------------------------- |
| `track`           | `EnrichedTrack \| null`                           | Current track (null = waiting)    |
| `renderTheme`     | `(props: ThemeRenderProps) => ReactNode`          | Your theme renderer               |
| `animationTiming` | `{ exitDuration: number, enterDuration: number }` | Timing in ms (default: 1500/1500) |

## Available Utilities

- **`AlbumArt`** — Album artwork component with loading states, error fallback
  (music note icon), and size variants (`sm`, `md`, `lg`, `xl`)
- **`BaseOverlay`** — Handles track change detection, animation lifecycle, and
  prop mapping

## Shipping Themes to Now Playing

You ship themes by building a `.np3theme` file and uploading it from the Now
Playing dashboard.

### 1. Name the bundle

`bundle.config.json` holds one thing — what your bundle is called:

```json
{
  "name": "My Themes"
}
```

Themes themselves are discovered from `src/themes/`, so there is no list to keep
in sync. Whatever is in that folder at build time is what ships — and only that
folder, which is why the kit's `src/examples/` never ends up in a bundle.

### 2. Build the bundle

Either click **Download .np3theme** in the playground footer (fastest — it runs
the same build and saves the file straight to your downloads folder), or run:

```bash
npm run build
```

This typechecks your themes, then produces `dist-bundle/<slug>.np3theme`, named
after the `name` in `bundle.config.json`. The file is a ZIP archive under the
hood, containing:

- `manifest.json` — the bundle descriptor used by the upload validator
- `shared/entry.js` + `shared/style.css` — one shared bundle for all themes
- `themes/<id>/index.html` — per-theme entry HTML the iframe loads

A typecheck failure fails the build, and so does a theme with a missing or
duplicate `meta.id` — a broken theme can't be packaged. With no themes in
`src/themes/` the build stops and tells you to add one.

### 3. Upload it

Go to **Dashboard → Overlays → Configure**, scroll to **Custom Themes**, and
pick your `.np3theme` file. Each theme inside the bundle becomes a separate
option in the theme picker under "Custom".

Custom themes require an active paid subscription.

### Receiving track data

Themes you build with `BaseOverlay` work out of the box: the bundle entry
listens for `np:track` messages from the parent overlay page and passes the
current `track` prop through to your component.
