import { EnrichedTrack } from "../types";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";

// ── Timing ───────────────────────────────────────────────────────────

const EXIT_JITTER_MS = 500;
const EXIT_SCATTER_MS = 600;
const ENTER_SWEEP_MS = 50;   // near-instant reposition off the other side
const ENTER_SETTLE_MS = 650;

// BaseOverlay timing: exit covers jitter+scatter, enter covers sweep+settle
const EXIT_DURATION = EXIT_JITTER_MS + EXIT_SCATTER_MS + 50;  // 1150ms
const ENTER_DURATION = ENTER_SWEEP_MS + ENTER_SETTLE_MS + 150; // 850ms

// ── Slice config ─────────────────────────────────────────────────────

const NUM_SLICES = 6;
const SETTLE_STAGGER_S = 0.04; // stagger between slices on enter

// Per-slice horizontal jitter displacements (px) during exit jitter phase
const SLICE_JITTER: [number, number, number][] = [
  [-14,  9,  -6],
  [ 18, -9,   4],
  [-22, 13,  -9],
  [  9, -17, 22],
  [-7,  20, -14],
  [ 25, -6,  11],
];

// Where each slice scatters to on exit (opposite sign = enter origin)
const SLICE_SCATTER_X = [-200, 140, -260, 180, -110, 230];

// ── Variant factory ──────────────────────────────────────────────────
// Precomputed at module level so references are stable across renders.

type GlitchPhase = "rest" | "exit-jitter" | "exit-scatter" | "enter-sweep" | "enter-settle";

function buildSliceVariants(i: number): Variants {
  const [j0, j1, j2] = SLICE_JITTER[i]!;
  const scatterX = SLICE_SCATTER_X[i]!;
  const sweepX = -scatterX * 0.75;

  return {
    rest: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.1 },
    },
    "exit-jitter": {
      x: [0, j0, j1, j2, j0 * 1.4, 0],
      transition: {
        duration: EXIT_JITTER_MS / 1000,
        times: [0, 0.15, 0.32, 0.52, 0.75, 1.0],
        ease: "linear",
      },
    },
    "exit-scatter": {
      x: scatterX,
      opacity: 0,
      transition: {
        duration: EXIT_SCATTER_MS / 1000,
        ease: [0.4, 0, 1, 1] as [number, number, number, number],
        delay: i * 0.025,
      },
    },
    "enter-sweep": {
      x: sweepX,
      opacity: 0,
      transition: { duration: 0.001 },
    },
    "enter-settle": {
      x: [sweepX, j1 * 0.8, j0 * 0.4, 0],
      opacity: 1,
      transition: {
        duration: ENTER_SETTLE_MS / 1000,
        times: [0, 0.3, 0.6, 1.0],
        ease: "linear",
        delay: i * SETTLE_STAGGER_S,
      },
    },
  };
}

const SLICE_VARIANTS = Array.from({ length: NUM_SLICES }, (_, i) =>
  buildSliceVariants(i),
);

// ── Helper ────────────────────────────────────────────────────────────

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ── GlitchTextBlock ───────────────────────────────────────────────────
// Renders text as N stacked clip-path slices, each animated independently.

interface GlitchTextBlockProps {
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  fontFamily: string;
  letterSpacing?: string;
  phase: GlitchPhase;
  delayMs?: number;
}

function GlitchTextBlock({
  text,
  fontSize,
  fontWeight,
  color,
  fontFamily,
  letterSpacing = "0.05em",
  phase,
  delayMs = 0,
}: GlitchTextBlockProps) {
  const [localPhase, setLocalPhase] = useState<GlitchPhase>(phase);

  useEffect(() => {
    if (delayMs === 0) {
      setLocalPhase(phase);
      return;
    }
    const t = setTimeout(() => setLocalPhase(phase), delayMs);
    return () => clearTimeout(t);
  }, [phase, delayMs]);
  return (
    <div
      style={{
        display: "grid",
        gridTemplate: "1fr / 1fr",
        fontSize,
        fontWeight,
        fontFamily,
        color,
        letterSpacing,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
      }}
    >
      {Array.from({ length: NUM_SLICES }, (_, i) => {
        const top = (i / NUM_SLICES) * 100;
        const bottom = ((NUM_SLICES - i - 1) / NUM_SLICES) * 100;
        return (
          <motion.div
            key={i}
            style={{
              gridArea: "1 / 1 / 2 / 2",
              clipPath: `inset(${top}% 0 ${bottom}% 0)`,
            }}
            variants={SLICE_VARIANTS[i]}
            animate={localPhase}
            initial="rest"
          >
            {text}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Custom props ──────────────────────────────────────────────────────

interface GlitchedThemeProps {
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
    label?: number;
  };
}

// ── Inner component ───────────────────────────────────────────────────

function GlitchedTheme({
  title,
  artist,
  label,
  isAnimating,
  accentColor = "#00ff41",
  textColor = "#ffffff",
  fontFamily = "'VT323', 'Courier New', monospace",
  fontSize = {},
}: ThemeRenderProps & GlitchedThemeProps) {
  const [phase, setPhase] = useState<GlitchPhase>("rest");

  const titleSize = fontSize.title ?? 60;
  const artistSize = fontSize.artist ?? 36;
  const labelSize = fontSize.label ?? 22;

  useEffect(() => {
    if (!isAnimating) {
      setPhase("rest");
      return;
    }

    let cancelled = false;

    const run = async () => {
      setPhase("exit-jitter");
      await wait(EXIT_JITTER_MS);
      if (cancelled) return;

      setPhase("exit-scatter");
      await wait(EXIT_SCATTER_MS);
      if (cancelled) return;

      // Track data has now been swapped by BaseOverlay.
      // Instantly reposition slices off the opposite side.
      setPhase("enter-sweep");
      await wait(ENTER_SWEEP_MS);
      if (cancelled) return;

      setPhase("enter-settle");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isAnimating]);

  return (
    <div className="relative flex flex-col" style={{ fontFamily, gap: "3px" }}>
      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)",
          zIndex: 10,
        }}
      />

      {/* Artist */}
      <GlitchTextBlock
        text={artist.toUpperCase()}
        fontSize={artistSize}
        fontWeight={400}
        color={accentColor}
        fontFamily={fontFamily}
        letterSpacing="0.2em"
        phase={phase}
      />

      {/* Title */}
      <GlitchTextBlock
        text={title.toUpperCase()}
        fontSize={titleSize}
        fontWeight={700}
        color={textColor}
        fontFamily={fontFamily}
        letterSpacing="0.04em"
        phase={phase}
        delayMs={200}
      />

      {/* Label */}
      {label && (
        <GlitchTextBlock
          text={label.toUpperCase()}
          fontSize={labelSize}
          fontWeight={400}
          color="#555555"
          fontFamily={fontFamily}
          letterSpacing="0.3em"
          phase={phase}
        />
      )}
    </div>
  );
}

// ── Outer component ───────────────────────────────────────────────────

interface GlitchedProps {
  track: EnrichedTrack | null;
  accentColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
    label?: number;
  };
}

export function Glitched({
  track,
  accentColor,
  textColor,
  fontFamily,
  fontSize,
}: GlitchedProps) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{
        exitDuration: EXIT_DURATION,
        enterDuration: ENTER_DURATION,
      }}
      renderTheme={(props) => (
        <GlitchedTheme
          {...props}
          accentColor={accentColor}
          textColor={textColor}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}
