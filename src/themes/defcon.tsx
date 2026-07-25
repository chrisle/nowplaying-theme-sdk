import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";
import { AlbumArt } from "../components/album-art";

// ── Animation config ────────────────────────────────────────────────
// The overlay assembles like a die-cut label being printed: trace draws,
// panel wipes down, LCD window opens, text types in, metadata stamps on.
// Exit is the mechanical reverse — backspace, close, fold up, retract.

const EXIT_MS = 1450;
const ENTER_MS = 3600;

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

// HUD fonts load from Google Fonts at runtime so the theme works both in the
// playground and inside a bundled overlay iframe.
const FONT_LINK_ID = "np3-defcon-fonts";
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Michroma&family=Space+Mono:wght@400;700&display=swap";

// Die-cut sticker silhouette: 45° chamfers of varying sizes plus stepped
// edges along the top and bottom runs — no plain rectangle corners.
const PANEL_CLIP = `polygon(
  0 16px, 16px 0,
  60% 0, calc(60% + 14px) 12px,
  calc(100% - 32px) 12px, 100% 44px,
  100% calc(100% - 16px), calc(100% - 16px) 100%,
  30% 100%, calc(30% - 10px) calc(100% - 8px),
  0 calc(100% - 8px)
)`;

// Header paper slab with a slanted right edge (matches the top step)
const SLAB_CLIP = "polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)";

// Small chamfered chip (label tag, art caption)
const CHIP_CLIP =
  "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))";

type Phase = "rest" | "exit" | "enter";

// Glyphs the typing edge cycles through before each real letter settles
const CYCLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>*+";

function cycleChar(): string {
  return CYCLE_CHARS.charAt(Math.floor(Math.random() * CYCLE_CHARS.length));
}

/**
 * Append an alpha byte to a 6-digit hex color. Anything else (named colors,
 * partial hex typed into the playground's text input) passes through opaque
 * instead of producing an invalid CSS value.
 */
function alpha(color: string, a: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${a}` : color;
}

/** Two-layer neon bloom for text-shadow / box-shadow values */
function glowOf(color: string, radius: number): string {
  return `0 0 ${radius}px ${alpha(color, "b3")}, 0 0 ${radius * 2}px ${alpha(color, "40")}`;
}

// Leetspeak substitutions for the optional hacker-letters mode (O T I S only)
const LEET_MAP: Record<string, string> = {
  I: "1",
  O: "0",
  S: "5",
  T: "7",
};

function toLeet(s: string): string {
  return s.replace(/[iost]/gi, (c) => LEET_MAP[c.toUpperCase()] ?? c);
}

/** 4-hex-digit code derived from the track — changes with every song */
function trackHex(title: string, artist: string): string {
  let h = 0;
  const s = `${title}::${artist}`;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).slice(0, 4).toUpperCase().padStart(4, "0");
}

// ── Typewriter text ─────────────────────────────────────────────────

/**
 * Types text in character-by-character behind a block caret, with a small
 * matrix-style decode window at the typing edge — the next few characters
 * cycle through random glyphs before settling into the real ones. Backspaces
 * cleanly during the exit phase. Keyed on phase as well as text so the line
 * retypes even when the next track carries an identical string (back-to-back
 * songs by the same artist).
 */
function TypeReveal({
  text,
  phase,
  delay = 0,
  active = true,
  onDone,
  className,
  style,
  caret = "always",
  caretColor = "#f4f4f1",
}: {
  text: string;
  phase: Phase;
  delay?: number;
  /** Typing waits until this flips true — used to chain title → artist */
  active?: boolean;
  /** Fires once the full string is on screen */
  onDone?: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** "always" keeps the caret blinking at rest; "typing" hides it once done */
  caret?: "always" | "typing" | false;
  caretColor?: string;
}) {
  const [count, setCount] = useState(text.length);
  const countRef = useRef(count);
  countRef.current = count;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // Exit: backspace the current line out
    if (phase === "exit") {
      const chunk = Math.max(1, Math.ceil(text.length / 12));
      const id = setInterval(() => {
        setCount((c) => Math.max(0, c - chunk));
      }, 35);
      return () => clearInterval(id);
    }

    // Enter/rest: type toward the full string after the stage delay,
    // holding until an upstream line finishes when chained via `active`
    if (!active) return;
    if (countRef.current >= text.length) {
      setCount(text.length);
      onDoneRef.current?.();
      return;
    }
    const chunk = Math.max(1, Math.ceil(text.length / 28));
    // Stage delay only applies during the choreographed enter; if typing is
    // resumed at rest (e.g. after an interrupted transition) start right away.
    const startDelay = phase === "enter" ? delay : 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    let current = countRef.current;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        current = Math.min(text.length, current + chunk);
        setCount(current);
        if (current >= text.length) {
          if (interval) clearInterval(interval);
          onDoneRef.current?.();
        }
      }, 65);
    }, startDelay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, phase, delay, active]);

  // Rolling decode window: only while actively typing (count moving between
  // 1 and full length, outside the exit teardown)
  const shown = Math.min(count, text.length);
  const typing = shown < text.length;
  const scramble =
    phase !== "exit" && active && shown > 0 && typing
      ? text
          .slice(shown, Math.min(shown + 3, text.length))
          .split("")
          .map((c) => (c === " " ? " " : cycleChar()))
          .join("")
      : "";
  const showCaret =
    caret === "always" || (caret === "typing" && (typing || phase === "exit"));

  return (
    <span className={className} style={style}>
      {text.slice(0, shown)}
      {scramble && <span style={{ opacity: 0.55 }}>{scramble}</span>}
      {showCaret && (
        <motion.span
          className="ml-[3px] inline-block w-[0.45em]"
          style={{ height: "0.9em", backgroundColor: caretColor }}
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
        />
      )}
    </span>
  );
}

/** Tumbling wireframe cube, each face subdivided into a 4×4 grid */
function WireCube({
  size,
  color,
  glow,
}: {
  size: number;
  color: string;
  glow: boolean;
}) {
  const half = size / 2;
  const cell = size / 4;
  // Each face is rendered twice with backface-visibility: the bright copy
  // shows when it faces the viewer, the dim copy (pre-flipped 180°) shows
  // when it's the far side — cheap depth cueing for the tumble.
  const faceStyle = (transform: string, dim: boolean): React.CSSProperties => {
    const gridLine = alpha(color, dim ? "1a" : "40");
    return {
      position: "absolute",
      width: size,
      height: size,
      border: `1px solid ${alpha(color, dim ? "3a" : "bb")}`,
      backgroundImage: `repeating-linear-gradient(0deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent ${cell}px), repeating-linear-gradient(90deg, ${gridLine} 0px, ${gridLine} 1px, transparent 1px, transparent ${cell}px)`,
      backgroundColor: alpha(color, dim ? "05" : "0a"),
      backfaceVisibility: "hidden",
      transform: dim ? `${transform} rotateY(180deg)` : transform,
    };
  };
  const FACES = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(270deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];
  return (
    <div
      style={{
        perspective: 200,
        width: size,
        height: size,
        filter: glow ? `drop-shadow(0 0 4px ${alpha(color, "66")})` : undefined,
      }}
    >
      <motion.div
        style={{
          position: "relative",
          width: size,
          height: size,
          transformStyle: "preserve-3d",
        }}
        animate={{ rotateX: 360, rotateY: 720 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      >
        {FACES.map((t, i) => (
          <div key={`front-${i}`} style={faceStyle(t, false)} />
        ))}
        {FACES.map((t, i) => (
          <div key={`back-${i}`} style={faceStyle(t, true)} />
        ))}
      </motion.div>
    </div>
  );
}

// Grayscale static tile for the TV-snow bursts (SVG turbulence noise)
const NOISE_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='120' height='120' filter='url(#n)' opacity='0.9'/></svg>",
)}`;

interface TvBurst {
  id: number;
  duration: number;
  artFlicker: number[];
  artJitter: number[];
  noiseFlicker: number[];
  noiseDrift: string[];
}

/**
 * Randomly-timed TV interference: every few seconds the artwork flickers in
 * and out for a few frames behind a rolling static-snow overlay.
 */
function useTvGlitch(enabled: boolean): TvBurst | null {
  const [burst, setBurst] = useState<TvBurst | null>(null);

  useEffect(() => {
    if (!enabled) {
      setBurst(null);
      return;
    }
    let alive = true;
    let idleTimer: ReturnType<typeof setTimeout>;
    let burstTimer: ReturnType<typeof setTimeout>;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const schedule = () => {
      idleTimer = setTimeout(() => {
        if (!alive) return;
        const frames = 7;
        const duration = rand(0.3, 0.55);
        setBurst({
          id: performance.now(),
          duration,
          // Art drops in and out; always lands back at full opacity
          artFlicker: Array.from({ length: frames }, (_, i) =>
            i === frames - 1 ? 1 : rand(0.05, 0.85),
          ),
          artJitter: Array.from({ length: frames }, (_, i) =>
            i === frames - 1 ? 0 : rand(-4, 4),
          ),
          // Snow fades in, sputters, and cuts out
          noiseFlicker: Array.from({ length: frames }, (_, i) =>
            i === 0 || i === frames - 1 ? 0 : rand(0.35, 0.95),
          ),
          noiseDrift: Array.from(
            { length: frames },
            () => `${rand(0, 90).toFixed(0)}px ${rand(0, 90).toFixed(0)}px`,
          ),
        });
        burstTimer = setTimeout(
          () => {
            if (!alive) return;
            setBurst(null);
            schedule();
          },
          duration * 1000 + 60,
        );
      }, rand(3500, 9000));
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(idleTimer);
      clearTimeout(burstTimer);
    };
  }, [enabled]);

  return burst;
}

/** Index numeral that counts up to its value when the track changes */
function CountUp({
  value,
  phase,
  delay = 0,
  className,
  style,
}: {
  value: number;
  phase: Phase;
  /** Wait this long (ms) before counting a fresh value during the enter
   * choreography — so the spin happens after its block has faded in */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Start at zero so the numeral counts up on first mount, not just on change
  const [shown, setShown] = useState(0);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const prevValue = useRef(-1);

  useEffect(() => {
    if (phase === "exit") return;
    // Count from zero for a new track, but resume mid-count if the phase
    // merely changed (e.g. enter → rest) so the numeral never double-counts.
    const fromScratch = prevValue.current !== value;
    prevValue.current = value;
    const from = fromScratch ? 0 : Math.min(shownRef.current, value);
    if (from >= value) {
      setShown(value);
      return;
    }
    // Hold at 000 until the count begins so the fade-in never reveals a
    // half-counted (or stale) number
    if (fromScratch) setShown(0);
    const TICKS = 16;
    let k = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(
      () => {
        // Fast ease-out spin: big jumps early, settling onto the target
        interval = setInterval(() => {
          k++;
          const t = k / TICKS;
          const eased = 1 - (1 - t) * (1 - t);
          setShown(Math.round(from + (value - from) * eased));
          if (k >= TICKS && interval) clearInterval(interval);
        }, 40);
      },
      phase === "enter" && fromScratch ? delay : 0,
    );
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [value, phase, delay]);

  return (
    <span className={className} style={style}>
      {String(shown).padStart(3, "0")}
    </span>
  );
}

// Deterministic pseudo-random EQ bar loops (seeded by index so renders are stable)
const EQ_BARS = Array.from({ length: 10 }, (_, i) => {
  const seq = Array.from(
    { length: 5 },
    (_, k) => 0.2 + 0.8 * Math.abs(Math.sin(i * 2.7 + k * 1.9)),
  );
  return {
    seq: [...seq, seq[0] ?? 0.2],
    duration: 1.1 + ((i * 53) % 37) / 45,
  };
});

const BARCODE_BARS = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1];

// ── Custom props interface (inner component) ────────────────────────

interface DefconThemeProps {
  showArtwork?: boolean;
  showBackdrop?: boolean;
  showCallout?: boolean;
  showEqualizer?: boolean;
  showShadow?: boolean;
  showGlow?: boolean;
  showGlitch?: boolean;
  hackerText?: boolean;
  headerText?: string;
  panelColor?: string;
  paperColor?: string;
  accentColor?: string;
  signalColor?: string;
  screenColor?: string;
  textStrokeWidth?: number;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
  };
}

// ── Inner component: staged assembly + rendering ────────────────────

function DefconTheme({
  title,
  artist,
  label,
  artwork,
  isAnimating,
  showArtwork = true,
  showBackdrop = true,
  showCallout = true,
  showEqualizer = true,
  showShadow = true,
  showGlow = true,
  showGlitch = true,
  hackerText = true,
  headerText = "DEF CON 34",
  panelColor = "#0c111e",
  paperColor = "#f4f4f1",
  accentColor = "#f2e422",
  signalColor = "#45d8e6",
  screenColor = "#c9ecf4",
  textStrokeWidth = 2,
  fontFamily = "Michroma, 'Space Mono', system-ui, sans-serif",
  fontSize = { title: 32, artist: 19 },
}: ThemeRenderProps & DefconThemeProps) {
  const traceControls = useAnimation();
  const panelControls = useAnimation();
  const headerControls = useAnimation();
  const artControls = useAnimation();
  const bodyControls = useAnimation();
  const footerControls = useAnimation();

  const [phase, setPhase] = useState<Phase>("rest");
  // Chains the typewriter lines: the artist waits for the title to finish
  const [titleDone, setTitleDone] = useState(true);
  const hex = useMemo(() => trackHex(title, artist), [title, artist]);
  const indexNo = useMemo(() => parseInt(hex, 16) % 1000, [hex]);

  const displayTitle = hackerText ? toLeet(title) : title;
  const displayArtist = hackerText ? toLeet(artist) : artist;
  const displayLabel = label && hackerText ? toLeet(label) : label;

  // Random TV-interference bursts over the artwork
  const glitchBurst = useTvGlitch(showGlitch && showArtwork && !!artwork);

  // Load the HUD fonts once, shared by every instance of this theme
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!isAnimating) {
      // Snap to fully-assembled state (initial load or animation complete)
      setPhase("rest");
      setTitleDone(true);
      traceControls.start("in");
      panelControls.set({ clipPath: "inset(0 0 0% 0)", opacity: 1 });
      headerControls.set({ opacity: 1, x: 0 });
      artControls.set({ clipPath: "inset(0 0% 0 0)", opacity: 1 });
      bodyControls.set({ opacity: 1, y: 0 });
      footerControls.set({ opacity: 1, y: 0 });
      return;
    }

    const runAnimation = async () => {
      // Phase 1: Exit — tear the label down, quick mechanical reverse
      setPhase("exit");
      setTitleDone(false);
      await Promise.all([
        footerControls.start({
          opacity: 0,
          y: 4,
          transition: { duration: 0.25, ease: "easeIn" },
        }),
        bodyControls.start({
          opacity: 0,
          transition: { duration: 0.45, delay: 0.1, ease: "easeIn" },
        }),
        artControls.start({
          clipPath: "inset(0 100% 0 0)",
          transition: { duration: 0.35, delay: 0.1, ease: "easeIn" },
        }),
        headerControls.start({
          opacity: 0,
          x: -12,
          transition: { duration: 0.3, delay: 0.25, ease: "easeIn" },
        }),
        panelControls.start({
          clipPath: "inset(0 0 100% 0)",
          transition: { duration: 0.8, delay: 0.5, ease: "easeInOut" },
        }),
        traceControls.start("out"),
      ]);

      // Phase 2: Enter — assemble the new label in stages
      setPhase("enter");
      await Promise.all([
        traceControls.start("in"),
        panelControls.start({
          clipPath: "inset(0 0 0% 0)",
          transition: { duration: 0.65, delay: 0.2, ease: "easeOut" },
        }),
        headerControls.start({
          opacity: 1,
          x: 0,
          transition: { duration: 0.35, delay: 0.55, ease: "easeOut" },
        }),
        artControls.start({
          clipPath: "inset(0 0% 0 0)",
          transition: { duration: 0.45, delay: 0.7, ease: "easeOut" },
        }),
        bodyControls.start({
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, delay: 0.85, ease: "easeOut" },
        }),
        footerControls.start({
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, delay: 1.3, ease: "easeOut" },
        }),
      ]);
    };

    runAnimation();
  }, [
    isAnimating,
    traceControls,
    panelControls,
    headerControls,
    artControls,
    bodyControls,
    footerControls,
  ]);

  const status =
    phase === "exit"
      ? { text: "EJECT", color: "#ff5148" }
      : phase === "enter"
        ? { text: "WRITE", color: accentColor }
        : { text: "SYNC:OK", color: alpha(signalColor, "cc") };

  // Panel-colored outline so the display text holds against the art backdrop
  // (text-shadow in 8 directions, same cross-browser trick as the Clean theme)
  const strokeShadow =
    textStrokeWidth > 0
      ? [
          `-${textStrokeWidth}px -${textStrokeWidth}px 0 ${panelColor}`,
          `${textStrokeWidth}px -${textStrokeWidth}px 0 ${panelColor}`,
          `-${textStrokeWidth}px ${textStrokeWidth}px 0 ${panelColor}`,
          `${textStrokeWidth}px ${textStrokeWidth}px 0 ${panelColor}`,
          `0 -${textStrokeWidth}px 0 ${panelColor}`,
          `0 ${textStrokeWidth}px 0 ${panelColor}`,
          `-${textStrokeWidth}px 0 0 ${panelColor}`,
          `${textStrokeWidth}px 0 0 ${panelColor}`,
        ].join(", ")
      : "";
  const textStroke = strokeShadow ? { textShadow: strokeShadow } : {};
  // Artist line emits light: stroke first (keeps the edge), bloom on top
  const artistShadow = [
    strokeShadow || null,
    showGlow ? glowOf(signalColor, 7) : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="relative inline-block max-w-full"
      style={{
        fontFamily,
        paddingTop: showCallout ? 48 : 0,
        // drop-shadow (unlike box-shadow) traces the die-cut clip-path,
        // lifting the whole label off whatever OBS is compositing behind it
        filter: showShadow
          ? "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5)) drop-shadow(0 18px 44px rgba(0, 0, 0, 0.45))"
          : undefined,
      }}
    >
      {/* ── Connector trace: riser → 45° jog → run → node + tag ── */}
      {showCallout && (
        <div className="pointer-events-none absolute right-0 top-0 z-30 h-[48px] w-[240px]">
          {/* Continuous trace: panel edge → riser → 45° jog → run to the node.
              One SVG stroke so the joints can never drift apart; pathLength
              draws it in from the panel outward. */}
          <svg
            className="absolute right-0 top-0"
            width={240}
            height={64}
            viewBox="0 0 240 64"
            fill="none"
            style={{
              overflow: "visible",
              filter: showGlow
                ? `drop-shadow(0 0 3px ${alpha(signalColor, "99")})`
                : undefined,
            }}
          >
            <motion.path
              d="M 127 60 L 127 34 L 143 18 L 222 18"
              stroke={alpha(signalColor, "cc")}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={{
                in: {
                  pathLength: 1,
                  opacity: 1,
                  transition: { duration: 0.55, ease: "easeOut" },
                },
                out: {
                  pathLength: 0,
                  opacity: 0,
                  transition: { duration: 0.3, ease: "easeIn" },
                },
              }}
              initial="in"
              animate={traceControls}
            />
          </svg>
          {/* Diamond node */}
          <motion.span
            className="absolute"
            style={{
              right: 8,
              top: 13,
              width: 9,
              height: 9,
              rotate: 45,
              boxShadow: showGlow ? glowOf(accentColor, 6) : undefined,
              backgroundColor: accentColor,
            }}
            variants={{
              in: { scale: 1, opacity: 1, transition: { duration: 0.2, delay: 0.5 } },
              out: { scale: 0, opacity: 0, transition: { duration: 0.15 } },
            }}
            initial="in"
            animate={traceControls}
          />
          {/* Version tag */}
          <motion.span
            className="absolute whitespace-nowrap text-[11px]"
            style={{
              right: 26,
              top: 0,
              color: alpha(paperColor, "99"),
              fontFamily: MONO_FONT,
              letterSpacing: "0.14em",
            }}
            variants={{
              in: { opacity: 1, transition: { duration: 0.25, delay: 0.62 } },
              out: { opacity: 0, transition: { duration: 0.15 } },
            }}
            initial="in"
            animate={traceControls}
          >
            VER 127.129
          </motion.span>
        </div>
      )}

      {/* ── Panel reveal wrapper (wipes down on enter, folds up on exit) ── */}
      <motion.div
        animate={panelControls}
        initial={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
      >
        {/* Die-cut label silhouette */}
        <div
          className="relative flex min-w-[560px] max-w-full flex-col"
          style={{
            backgroundColor: panelColor,
            color: paperColor,
            clipPath: PANEL_CLIP,
          }}
        >
          {/* Blurred album-art glow behind the label content */}
          {showBackdrop && artwork && (
            <div className="pointer-events-none absolute inset-0 z-0">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("${artwork}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(42px) saturate(1.3)",
                  transform: "scale(1.45)",
                  opacity: 0.32,
                }}
              />
              {/* Contrast wash: darkest behind the art window, lightest behind the title */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, ${alpha(panelColor, "e6")} 0%, ${alpha(panelColor, "73")} 45%, ${alpha(panelColor, "cc")} 100%)`,
                }}
              />
            </div>
          )}

          {/* Accent sliver along the left edge */}
          <div
            className="pointer-events-none absolute bottom-[8px] left-0 z-10 w-[5px]"
            style={{
              top: 16,
              background: `linear-gradient(180deg, ${accentColor}, ${alpha(accentColor, "1a")})`,
              boxShadow: showGlow ? glowOf(accentColor, 7) : undefined,
            }}
          />

          {/* Decorative dot grid */}
          <div
            className="pointer-events-none absolute right-[120px] top-[52px] z-10 h-[14px] w-[38px]"
            style={{
              backgroundImage: `radial-gradient(circle, ${alpha(paperColor, "4d")} 1px, transparent 1px)`,
              backgroundSize: "8px 7px",
            }}
          />

          {/* Vertical spec text along the right edge */}
          <span
            className="pointer-events-none absolute right-[6px] top-[54px] z-10 select-none text-[10px] uppercase"
            style={{
              color: alpha(paperColor, "59"),
              writingMode: "vertical-rl",
              letterSpacing: "0.38em",
              fontFamily: MONO_FONT,
            }}
          >
            DEFCON.SYS
          </span>

          {/* ── Header bar: paper slab + slanted divider + metadata zone ── */}
          <motion.div
            className="relative z-10 flex h-[34px] items-stretch"
            animate={headerControls}
            initial={{ opacity: 1, x: 0 }}
          >
            <div
              className="flex w-[60%] items-center gap-2 pl-6 pr-8"
              style={{ backgroundColor: accentColor, clipPath: SLAB_CLIP }}
            >
              {/* Play glyph */}
              <span
                className="inline-block h-0 w-0 flex-shrink-0"
                style={{
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: `8px solid ${panelColor}`,
                }}
              />
              <span
                className="truncate text-[14px] font-bold uppercase"
                style={{ color: panelColor, letterSpacing: "0.32em" }}
              >
                {headerText}
              </span>
              {/* Status tick */}
              <motion.span
                className="ml-1 inline-block h-[5px] w-[5px] flex-shrink-0"
                style={{ backgroundColor: panelColor }}
                animate={{ opacity: [1, 1, 0.15, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, times: [0, 0.82, 0.9, 1] }}
              />
              {/* Diagonal hatch block against the slanted edge */}
              <span
                className="ml-auto h-[12px] w-[34px] flex-shrink-0"
                style={{
                  background: `repeating-linear-gradient(135deg, ${panelColor} 0px, ${panelColor} 4px, transparent 4px, transparent 8px)`,
                }}
              />
            </div>
            <div
              className="flex flex-1 items-center justify-end gap-3 pr-12 pt-[10px] text-[11px] uppercase"
              style={{ color: alpha(paperColor, "99"), fontFamily: MONO_FONT }}
            >
              {/* Checkerboard strip */}
              <span
                className="h-[10px] w-[30px] flex-shrink-0"
                style={{
                  backgroundImage: `repeating-conic-gradient(${alpha(paperColor, "59")} 0% 25%, transparent 0% 50%)`,
                  backgroundSize: "5px 5px",
                }}
              />
              <span style={{ color: status.color }}>{status.text}</span>
              <span style={{ color: alpha(paperColor, "4d") }}>⏐</span>
              <span>ID:NP3-{hex}</span>
            </div>
          </motion.div>

          {/* ── Main row ── */}
          <div className="relative z-10 flex items-center gap-5 px-6 py-4">
            {/* LCD artwork window */}
            {showArtwork && (
              <motion.div
                className="flex-shrink-0"
                animate={artControls}
                initial={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              >
                <div
                  className="p-[6px] pb-[3px]"
                  style={{
                    backgroundColor: screenColor,
                    clipPath: CHIP_CLIP,
                  }}
                >
                  <div className="relative overflow-hidden">
                    {/* TV interference: the art itself flickers in and out */}
                    <motion.div
                      animate={
                        glitchBurst
                          ? {
                              opacity: glitchBurst.artFlicker,
                              x: glitchBurst.artJitter,
                            }
                          : { opacity: 1, x: 0 }
                      }
                      transition={
                        glitchBurst
                          ? { duration: glitchBurst.duration, ease: "linear" }
                          : { duration: 0.15 }
                      }
                    >
                      <AlbumArt src={artwork} size="xl" className="!rounded-none" />
                    </motion.div>
                    {glitchBurst && (
                      <>
                        {/* Rolling static snow */}
                        <motion.div
                          key={glitchBurst.id}
                          className="pointer-events-none absolute inset-0"
                          style={{
                            backgroundImage: `url("${NOISE_URI}")`,
                            backgroundSize: "90px 90px",
                            mixBlendMode: "screen",
                          }}
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: glitchBurst.noiseFlicker,
                            backgroundPosition: glitchBurst.noiseDrift,
                          }}
                          transition={{
                            duration: glitchBurst.duration,
                            ease: "linear",
                          }}
                        />
                        {/* Scanline flash */}
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              "repeating-linear-gradient(0deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 3px)",
                            mixBlendMode: "screen",
                          }}
                        />
                      </>
                    )}
                  </div>
                  <div
                    className="flex items-center justify-between pt-[3px] text-[10px] uppercase"
                    style={{ color: "#33506b", fontFamily: MONO_FONT }}
                  >
                    <span>IMG.SRC</span>
                    <span className="flex h-[7px] items-stretch gap-[1px]">
                      {BARCODE_BARS.slice(0, 10).map((w, i) => (
                        <span
                          key={i}
                          style={{ width: w, backgroundColor: "#33506b" }}
                        />
                      ))}
                    </span>
                    <span>600×600</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Title / artist block */}
            <motion.div
              className="flex min-w-0 flex-1 flex-col gap-[7px]"
              animate={bodyControls}
              initial={{ opacity: 1, y: 0 }}
            >
              <div
                className="truncate uppercase leading-tight"
                style={{
                  fontSize: `${fontSize.title ?? 32}px`,
                  letterSpacing: "0.04em",
                  ...textStroke,
                }}
              >
                <TypeReveal
                  text={displayTitle}
                  phase={phase}
                  delay={850}
                  caret="typing"
                  onDone={() => setTitleDone(true)}
                  caretColor={alpha(paperColor, "59")}
                />
              </div>
              <div
                className="h-px w-full"
                style={{ backgroundColor: alpha(paperColor, "33") }}
              />
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-[2px] w-5 flex-shrink-0"
                  style={{ backgroundColor: accentColor }}
                />
                <span
                  className="truncate font-bold uppercase"
                  style={{
                    fontSize: `${fontSize.artist ?? 19}px`,
                    letterSpacing: "0.2em",
                    fontFamily: MONO_FONT,
                    color: signalColor,
                    textShadow: artistShadow || undefined,
                  }}
                >
                  <TypeReveal
                    text={displayArtist}
                    phase={phase}
                    delay={150}
                    active={titleDone}
                    caret="always"
                    caretColor={alpha(paperColor, "59")}
                  />
                </span>
                {label && (
                  <span
                    className="hidden flex-shrink-0 px-[6px] py-[2px] text-[11px] font-bold uppercase sm:inline"
                    style={{
                      backgroundColor: accentColor,
                      color: panelColor,
                      clipPath: CHIP_CLIP,
                      fontFamily: MONO_FONT,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {displayLabel}
                  </span>
                )}
              </div>
              <div
                className="flex items-center gap-3 text-[11px] uppercase"
                style={{ color: alpha(paperColor, "66"), fontFamily: MONO_FONT }}
              >
                <span>RSD-2077.270-Y</span>
                <span>✳</span>
                <span>⊠</span>
                <span>AUDIO.FEED — 44.1KHZ</span>
              </div>
            </motion.div>

            {/* Index numeral block */}
            <motion.div
              className="ml-6 hidden w-[86px] flex-shrink-0 flex-col items-end gap-1 self-center pr-6 md:flex"
              animate={footerControls}
              initial={{ opacity: 1, y: 0 }}
            >
              <span
                className="text-[10px] uppercase"
                style={{
                  color: alpha(paperColor, "66"),
                  fontFamily: MONO_FONT,
                  letterSpacing: "0.28em",
                }}
              >
                TRK.NO
              </span>
              <CountUp
                value={indexNo}
                phase={phase}
                delay={1400}
                className="leading-none"
                style={{
                  fontSize: 26,
                  color: accentColor,
                  textShadow: showGlow ? glowOf(accentColor, 8) : undefined,
                }}
              />
              <span
                className="text-[12px]"
                style={{ color: alpha(paperColor, "59") }}
              >
                ✳ ⊘ ⊠
              </span>
              <div className="mb-1 mr-2 mt-3">
                <WireCube size={32} color={signalColor} glow={showGlow} />
              </div>
            </motion.div>
          </div>

          {/* ── Footer strip: rule, meter, barcode, spec text ── */}
          <motion.div
            className="relative z-10 mx-6 mb-[14px] flex items-center gap-4 border-t pt-[7px] text-[11px] uppercase"
            style={{
              borderColor: alpha(paperColor, "33"),
              color: alpha(paperColor, "80"),
              fontFamily: MONO_FONT,
            }}
            animate={footerControls}
            initial={{ opacity: 1, y: 0 }}
          >
            {showEqualizer && (
              <span className="flex h-[12px] items-end gap-[2px]">
                {EQ_BARS.map((bar, i) => (
                  <motion.span
                    key={i}
                    className="w-[2px] origin-bottom"
                    style={{
                      height: "100%",
                      backgroundColor:
                        i % 4 === 2 ? accentColor : alpha(signalColor, "cc"),
                    }}
                    animate={{ scaleY: bar.seq }}
                    transition={{
                      duration: bar.duration,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </span>
            )}
            <span className="flex h-[12px] items-stretch gap-[1px]">
              {BARCODE_BARS.map((w, i) => (
                <span
                  key={i}
                  style={{ width: w, backgroundColor: alpha(paperColor, "99") }}
                />
              ))}
            </span>
            <span>NKD 37T4-T</span>
            <span
              className="h-[10px] w-[26px]"
              style={{
                background: `repeating-linear-gradient(45deg, ${accentColor} 0px, ${accentColor} 4px, transparent 4px, transparent 8px)`,
              }}
            />
            <span className="ml-auto pr-6">01/09/2077</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Outer component props (public API) ──────────────────────────────

interface DefconProps {
  track: EnrichedTrack | null;
  showArtwork?: boolean;
  showBackdrop?: boolean;
  showCallout?: boolean;
  showEqualizer?: boolean;
  showShadow?: boolean;
  showGlow?: boolean;
  showGlitch?: boolean;
  hackerText?: boolean;
  headerText?: string;
  panelColor?: string;
  paperColor?: string;
  accentColor?: string;
  signalColor?: string;
  screenColor?: string;
  textStrokeWidth?: number;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
  };
}

// ── Outer component: BaseOverlay wrapper ────────────────────────────

export function Defcon({
  track,
  showArtwork,
  showBackdrop,
  showCallout,
  showEqualizer,
  showShadow,
  showGlow,
  showGlitch,
  hackerText,
  headerText,
  panelColor,
  paperColor,
  accentColor,
  signalColor,
  screenColor,
  textStrokeWidth,
  fontFamily,
  fontSize,
}: DefconProps) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: EXIT_MS, enterDuration: ENTER_MS }}
      renderTheme={(props) => (
        <DefconTheme
          {...props}
          showArtwork={showArtwork}
          showBackdrop={showBackdrop}
          showCallout={showCallout}
          showEqualizer={showEqualizer}
          showShadow={showShadow}
          showGlow={showGlow}
          showGlitch={showGlitch}
          hackerText={hackerText}
          headerText={headerText}
          panelColor={panelColor}
          paperColor={paperColor}
          accentColor={accentColor}
          signalColor={signalColor}
          screenColor={screenColor}
          textStrokeWidth={textStrokeWidth}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}
