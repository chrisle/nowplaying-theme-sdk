# Theme File Template

Use this as the structural template when creating `src/themes/<kebab-name>.tsx`.

Adapt the animations, layout, and styles to match the user's requested visual design. This template shows the required structure — not the exact animations to use.

```tsx
import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";
// Optional: import { AlbumArt } from "../components/album-art";

// ── Animation config ────────────────────────────────────────────────

const EXIT_DURATION = 0.8;
const ENTER_DURATION = 0.8;

// ── Custom props interface (inner component) ────────────────────────

interface __Name__ThemeProps {
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
}

// ── Inner component: animations + rendering ─────────────────────────

function __Name__Theme({
  title,
  artist,
  label,
  artwork,
  isAnimating,
  accentColor = "#ff0000",
  textColor = "#ffffff",
  fontFamily = "system-ui, sans-serif",
}: ThemeRenderProps & __Name__ThemeProps) {
  const titleControls = useAnimation();
  const artistControls = useAnimation();

  useEffect(() => {
    if (!isAnimating) {
      // Snap to resting position (initial load or animation complete)
      titleControls.start({ opacity: 1, y: 0 });
      artistControls.start({ opacity: 1, y: 0 });
      return;
    }

    const runAnimation = async () => {
      // Phase 1: Exit — animate elements off-screen
      await Promise.all([
        titleControls.start({
          opacity: 0,
          y: -30,
          transition: { duration: EXIT_DURATION, ease: "easeIn" },
        }),
        artistControls.start({
          opacity: 0,
          y: -30,
          transition: { duration: EXIT_DURATION, ease: "easeIn", delay: 0.1 },
        }),
      ]);

      // Phase 2: Enter — animate elements back on-screen
      // (BaseOverlay has already swapped the track data between phases)
      await Promise.all([
        titleControls.start({
          opacity: 1,
          y: 0,
          transition: { duration: ENTER_DURATION, ease: "easeOut" },
        }),
        artistControls.start({
          opacity: 1,
          y: 0,
          transition: { duration: ENTER_DURATION, ease: "easeOut", delay: 0.1 },
        }),
      ]);
    };

    runAnimation();
  }, [isAnimating, titleControls, artistControls]);

  return (
    <div
      style={{
        fontFamily,
        color: textColor,
      }}
    >
      <motion.div
        animate={titleControls}
        initial={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold uppercase"
      >
        {title}
      </motion.div>

      <motion.div
        animate={artistControls}
        initial={{ opacity: 1, y: 0 }}
        className="text-2xl uppercase"
      >
        {artist}
      </motion.div>
    </div>
  );
}

// ── Outer component props (public API) ──────────────────────────────

interface __Name__Props {
  track: EnrichedTrack | null;
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
}

// ── Outer component: BaseOverlay wrapper ────────────────────────────

export function __Name__({
  track,
  accentColor,
  textColor,
  fontFamily,
}: __Name__Props) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{
        // Must account for animation duration + any stagger delays
        exitDuration: (EXIT_DURATION + 0.1) * 1000,   // seconds → ms
        enterDuration: (ENTER_DURATION + 0.1) * 1000,  // seconds → ms
      }}
      renderTheme={(props) => (
        <__Name__Theme
          {...props}
          accentColor={accentColor}
          textColor={textColor}
          fontFamily={fontFamily}
        />
      )}
    />
  );
}
```

## Template Notes

- Replace all `__Name__` placeholders with the actual theme name (PascalCase)
- The animation style shown (opacity + y translate) is just an example — adapt to the theme's concept
- `animationTiming` values must be in **milliseconds** and should cover the full duration including any stagger delays
- Add more `useAnimation()` controllers as needed for additional animated elements
- Include all custom props in both the inner interface, outer interface, outer component signature, and the `renderTheme` pass-through
