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

## Reactive themes and controller events

A theme definition can subscribe to `track`, `mix`, and `controller`:

```tsx
import type { ThemeMeta, ThemeProps } from "../theme";
import { controllerValue } from "../events";

export const meta: ThemeMeta = {
  id: "my-reactive-theme",
  name: "My Reactive Theme",
  events: ["track", "controller"],
};

export default function MyReactiveTheme({ track, controller }: ThemeProps) {
  const fader = controllerValue(controller, "deck1.channelFader");
  return (
    <div style={{ opacity: typeof fader === "number" ? fader : 0 }}>
      {track?.title}
    </div>
  );
}
```

`controller` is physical MIDI state from NP3's existing device mappings, before
source-authority merging, crossfader gating or on-air scoring. `mixState` is
NP3's interpreted mix state. They are separate feeds. Neither is an audio meter.
Omitting `events` preserves the legacy track + mix subscriptions; `events: []`
requests neither. The bundle manifest retains each theme's subscriptions.

Faders and trim use 0–1; EQ, filter, pitch and crossfader use -1–1. The snapshot
contains `availableControls` (supported by the mapping), `observedControls`
(reported since connection/reset), and `connected`. `controllerValue` returns
`undefined` for unavailable, disconnected or never-observed controls, so initial
defaults do not masquerade as hardware readings. Button/toggle state follows
NP3's existing MIDI interpretation. Unsupported controls are not advertised.

### Test with your MIDI controller

1. Run the updated NP3 desktop app with `NP_THEME_DEV_TOKEN` set to a random
   development token of at least 32 characters. The loopback listener is
   disabled unless this variable is set.
2. Set the same token in the SDK's `.env.local`:
   `NP_THEME_DEV_TOKEN=<your-development-token>` and restart `npm run dev`.
   Alternatively, launch both processes from shells with that variable exported.
   Do not prefix it with `VITE_`: it stays on the server, outside the browser
   bundle.
3. Open the playground using `localhost` or `127.0.0.1`, select **Reactive
   Mixer**, then choose **Now Playing / MIDI** under **Event inputs**. NP3 must
   have a supported controller connected and its MIDI mapping loaded.
4. Move a fader or knob. The preview receives the same controller event envelope
   used by NP3 overlays. Multiple MIDI ports feed the same controller state.

For example, a shell can generate a token without printing it:

```sh
export NP_THEME_DEV_TOKEN="$(node -p "require('node:crypto').randomBytes(32).toString('hex')")"
```

The SDK proxies its local event endpoint to NP3 on `127.0.0.1:17831`, injecting
the development token server-side. The listener grants read-only event access
and rejects direct browser-origin requests. The NP3 desktop changes must be
built/run locally or included in a subsequent app release; existing installed
versions do not provide this endpoint. Production controller delivery also
requires the corresponding web-server changes.

### Simulate, record and replay

**Simulated mixer** provides four decks with faders, EQ, filter, trim, pitch,
buttons and crossfader. Its mix scores are mocked; it does not simulate NP3's
on-air algorithm. **Record** captures the starting snapshot plus event timing.
**Replay** sends those events through the same decoder used by the live feed and
the shipped iframe. **Save session** and **Load session** let you reuse
recordings. Recording stops at 10,000 frames; imported sessions must be at most
10 MB and one hour long. Transport failures and controller disconnects clear
stale values.

The shipped protocol remains version 1 with an additive controller message:

```ts
{ type: "np:controller", protocol: 1, controller: snapshot /* or null */ }
{ type: "np:mix", protocol: 1, state: mixState /* or null */ }
```

`src/examples/reactive-mixer.tsx` in the upstream SDK demonstrates
controller-driven visuals. This theme checkout also bundles it as
`src/themes/reactive-mixer.tsx`. Run `npm test`, `npm run typecheck`, and
`npm run build` before shipping.
