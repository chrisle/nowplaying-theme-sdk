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
const ENTER_MS = 3000;

const MONO_FONT = "'Space Mono', ui-monospace, monospace";

// HUD fonts load from Google Fonts at runtime so the theme works both in the
// playground and inside a bundled overlay iframe.
const FONT_LINK_ID = "np3-cyberpunk-fonts";
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

// Holographic foil gradient — the one non-monochrome accent
const HOLO_GRADIENT =
  "linear-gradient(115deg, #f6c6de 0%, #c9f2df 22%, #cfe0f7 45%, #e6d3f7 68%, #f6e3c6 85%, #f6c6de 100%)";

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
  className,
  style,
  caret = true,
  caretColor = "#f4f4f1",
}: {
  text: string;
  phase: Phase;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  caret?: boolean;
  caretColor?: string;
}) {
  const [count, setCount] = useState(text.length);
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    // Exit: backspace the current line out
    if (phase === "exit") {
      const chunk = Math.max(1, Math.ceil(text.length / 12));
      const id = setInterval(() => {
        setCount((c) => Math.max(0, c - chunk));
      }, 35);
      return () => clearInterval(id);
    }

    // Enter/rest: type toward the full string after the stage delay
    if (countRef.current >= text.length) {
      setCount(text.length);
      return;
    }
    const chunk = Math.max(1, Math.ceil(text.length / 28));
    // Stage delay only applies during the choreographed enter; if typing is
    // resumed at rest (e.g. after an interrupted transition) start right away.
    const startDelay = phase === "enter" ? delay : 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setCount((c) => {
          const next = Math.min(text.length, c + chunk);
          if (next >= text.length && interval) clearInterval(interval);
          return next;
        });
      }, 65);
    }, startDelay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, phase, delay]);

  // Rolling decode window: only while actively typing (count moving between
  // 1 and full length, outside the exit teardown)
  const shown = Math.min(count, text.length);
  const scramble =
    phase !== "exit" && shown > 0 && shown < text.length
      ? text
          .slice(shown, Math.min(shown + 3, text.length))
          .split("")
          .map((c) => (c === " " ? " " : cycleChar()))
          .join("")
      : "";

  return (
    <span className={className} style={style}>
      {text.slice(0, shown)}
      {scramble && <span style={{ opacity: 0.55 }}>{scramble}</span>}
      {caret && (
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

/** Index numeral that counts up to its value when the track changes */
function CountUp({
  value,
  phase,
  className,
  style,
}: {
  value: number;
  phase: Phase;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const prevValue = useRef(value);

  useEffect(() => {
    if (phase === "exit") return;
    // Count from zero for a new track, but resume mid-count if the phase
    // merely changed (e.g. enter → rest) so the numeral never double-counts.
    const fromScratch = prevValue.current !== value;
    prevValue.current = value;
    let current = fromScratch ? 0 : Math.min(shownRef.current, value);
    if (current >= value) {
      setShown(value);
      return;
    }
    const step = Math.max(1, Math.ceil(value / 20));
    const id = setInterval(() => {
      current = Math.min(value, current + step);
      setShown(current);
      if (current >= value) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [value, phase]);

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

interface CyberpunkThemeProps {
  showArtwork?: boolean;
  showBackdrop?: boolean;
  showCallout?: boolean;
  showEqualizer?: boolean;
  showHolo?: boolean;
  showShadow?: boolean;
  panelColor?: string;
  paperColor?: string;
  screenColor?: string;
  textStrokeWidth?: number;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
  };
}

// ── Inner component: staged assembly + rendering ────────────────────

function CyberpunkTheme({
  title,
  artist,
  label,
  artwork,
  isAnimating,
  showArtwork = true,
  showBackdrop = true,
  showCallout = true,
  showEqualizer = true,
  showHolo = true,
  showShadow = true,
  panelColor = "#0b0b0d",
  paperColor = "#f4f4f1",
  screenColor = "#d9eaf7",
  textStrokeWidth = 2,
  fontFamily = "Michroma, 'Space Mono', system-ui, sans-serif",
  fontSize = { title: 26, artist: 15 },
}: ThemeRenderProps & CyberpunkThemeProps) {
  const traceControls = useAnimation();
  const panelControls = useAnimation();
  const headerControls = useAnimation();
  const artControls = useAnimation();
  const bodyControls = useAnimation();
  const footerControls = useAnimation();

  const [phase, setPhase] = useState<Phase>("rest");
  const hex = useMemo(() => trackHex(title, artist), [title, artist]);
  const indexNo = useMemo(() => parseInt(hex, 16) % 1000, [hex]);

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
    phase === "exit" ? "EJECT" : phase === "enter" ? "WRITE" : "SYNC:OK";

  // Panel-colored outline so the display text holds against the art backdrop
  // (text-shadow in 8 directions, same cross-browser trick as the Clean theme)
  const textStroke =
    textStrokeWidth > 0
      ? {
          textShadow: [
            `-${textStrokeWidth}px -${textStrokeWidth}px 0 ${panelColor}`,
            `${textStrokeWidth}px -${textStrokeWidth}px 0 ${panelColor}`,
            `-${textStrokeWidth}px ${textStrokeWidth}px 0 ${panelColor}`,
            `${textStrokeWidth}px ${textStrokeWidth}px 0 ${panelColor}`,
            `0 -${textStrokeWidth}px 0 ${panelColor}`,
            `0 ${textStrokeWidth}px 0 ${panelColor}`,
            `-${textStrokeWidth}px 0 0 ${panelColor}`,
            `${textStrokeWidth}px 0 0 ${panelColor}`,
          ].join(", "),
        }
      : {};

  const holoStyle = {
    backgroundImage: HOLO_GRADIENT,
    backgroundSize: "300% 100%",
  };

  return (
    <div
      className="relative inline-block max-w-full"
      style={{
        fontFamily,
        paddingTop: showCallout ? 40 : 0,
        // drop-shadow (unlike box-shadow) traces the die-cut clip-path,
        // lifting the whole label off whatever OBS is compositing behind it
        filter: showShadow
          ? "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5)) drop-shadow(0 18px 44px rgba(0, 0, 0, 0.45))"
          : undefined,
      }}
    >
      {/* ── Connector trace: riser → 45° jog → run → node + tag ── */}
      {showCallout && (
        <div className="pointer-events-none absolute right-0 top-0 z-30 h-[40px] w-[240px]">
          {/* Riser from the panel's stepped top edge */}
          <motion.span
            className="absolute origin-bottom"
            style={{
              right: 112,
              top: 25,
              width: 2,
              height: 28,
              backgroundColor: alpha(paperColor, "b3"),
            }}
            variants={{
              in: { scaleY: 1, opacity: 1, transition: { duration: 0.2 } },
              out: { scaleY: 0, opacity: 0, transition: { duration: 0.25 } },
            }}
            initial="in"
            animate={traceControls}
          />
          {/* 45° diagonal jog */}
          <motion.span
            className="absolute"
            style={{
              right: 98,
              top: 10,
              width: 22,
              height: 2,
              backgroundColor: alpha(paperColor, "b3"),
              transformOrigin: "100% 50%",
              rotate: 45,
            }}
            variants={{
              in: {
                scaleX: 1,
                opacity: 1,
                transition: { duration: 0.18, delay: 0.2 },
              },
              out: { scaleX: 0, opacity: 0, transition: { duration: 0.2 } },
            }}
            initial="in"
            animate={traceControls}
          />
          {/* Horizontal run */}
          <motion.span
            className="absolute origin-left"
            style={{
              right: 20,
              top: 9,
              width: 78,
              height: 2,
              backgroundColor: alpha(paperColor, "b3"),
            }}
            variants={{
              in: {
                scaleX: 1,
                opacity: 1,
                transition: { duration: 0.25, delay: 0.38 },
              },
              out: { scaleX: 0, opacity: 0, transition: { duration: 0.2 } },
            }}
            initial="in"
            animate={traceControls}
          />
          {/* Diamond node */}
          <motion.span
            className="absolute"
            style={{
              right: 8,
              top: 5,
              width: 9,
              height: 9,
              rotate: 45,
              ...(showHolo
                ? holoStyle
                : { backgroundColor: paperColor }),
            }}
            variants={{
              in: { scale: 1, opacity: 1, transition: { duration: 0.2, delay: 0.63 } },
              out: { scale: 0, opacity: 0, transition: { duration: 0.15 } },
            }}
            initial="in"
            animate={traceControls}
          />
          {/* Version tag */}
          <motion.span
            className="absolute whitespace-nowrap text-[9px]"
            style={{
              right: 24,
              top: 16,
              color: alpha(paperColor, "99"),
              fontFamily: MONO_FONT,
              letterSpacing: "0.14em",
            }}
            variants={{
              in: { opacity: 1, transition: { duration: 0.25, delay: 0.75 } },
              out: { opacity: 0, transition: { duration: 0.15 } },
            }}
            initial="in"
            animate={traceControls}
          >
            VER 127.129 // 0x{hex}
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

          {/* Holo foil sliver along the left edge */}
          {showHolo && (
            <motion.div
              className="pointer-events-none absolute bottom-[8px] left-0 z-10 w-[5px]"
              style={{ top: 16, ...holoStyle }}
              animate={{ backgroundPosition: ["0% 0%", "300% 0%"] }}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            />
          )}

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
            className="pointer-events-none absolute right-[6px] top-[54px] z-10 select-none text-[8px] uppercase"
            style={{
              color: alpha(paperColor, "59"),
              writingMode: "vertical-rl",
              letterSpacing: "0.38em",
              fontFamily: MONO_FONT,
            }}
          >
            CYBERPUNK.SYS
          </span>

          {/* ── Header bar: paper slab + slanted divider + metadata zone ── */}
          <motion.div
            className="relative z-10 flex h-[34px] items-stretch"
            animate={headerControls}
            initial={{ opacity: 1, x: 0 }}
          >
            <div
              className="flex w-[60%] items-center gap-2 pl-6"
              style={{ backgroundColor: paperColor, clipPath: SLAB_CLIP }}
            >
              {/* Play glyph */}
              <span
                className="inline-block h-0 w-0"
                style={{
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: `8px solid ${panelColor}`,
                }}
              />
              <span
                className="text-[11px] font-bold uppercase"
                style={{ color: panelColor, letterSpacing: "0.32em" }}
              >
                Now_Playing
              </span>
            </div>
            <div
              className="flex flex-1 items-center justify-end gap-3 pr-12 pt-[12px] text-[9px] uppercase"
              style={{ color: alpha(paperColor, "99"), fontFamily: MONO_FONT }}
            >
              <span>{status}</span>
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
                  <AlbumArt src={artwork} size="xl" className="!rounded-none" />
                  <div
                    className="flex items-center justify-between pt-[3px] text-[8px] uppercase"
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
                  fontSize: `${fontSize.title ?? 26}px`,
                  letterSpacing: "0.04em",
                  ...textStroke,
                }}
              >
                <TypeReveal
                  text={title}
                  phase={phase}
                  delay={850}
                  caretColor={paperColor}
                />
              </div>
              <div
                className="h-px w-full"
                style={{ backgroundColor: alpha(paperColor, "33") }}
              />
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-[2px] w-5 flex-shrink-0"
                  style={{ backgroundColor: alpha(paperColor, "80") }}
                />
                <span
                  className="truncate font-bold uppercase"
                  style={{
                    fontSize: `${fontSize.artist ?? 15}px`,
                    letterSpacing: "0.2em",
                    fontFamily: MONO_FONT,
                    ...textStroke,
                  }}
                >
                  <TypeReveal
                    text={artist}
                    phase={phase}
                    delay={1050}
                    caretColor={paperColor}
                  />
                </span>
                {label && (
                  <span
                    className="hidden flex-shrink-0 px-[6px] py-[2px] text-[9px] font-bold uppercase sm:inline"
                    style={{
                      backgroundColor: paperColor,
                      color: panelColor,
                      clipPath: CHIP_CLIP,
                      fontFamily: MONO_FONT,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>
              <div
                className="flex items-center gap-3 text-[9px] uppercase"
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
                className="text-[8px] uppercase"
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
                className="leading-none"
                style={{ fontSize: 30 }}
              />
              <span
                className="text-[10px]"
                style={{ color: alpha(paperColor, "59") }}
              >
                ✳ ⊘ ⊠
              </span>
            </motion.div>
          </div>

          {/* ── Footer strip: rule, meter, barcode, spec text ── */}
          <motion.div
            className="relative z-10 mx-6 mb-[14px] flex items-center gap-4 border-t pt-[7px] text-[9px] uppercase"
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
                    style={{ height: "100%", backgroundColor: alpha(paperColor, "cc") }}
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
            {showHolo && (
              <motion.span
                className="h-[10px] w-[26px]"
                style={holoStyle}
                animate={{ backgroundPosition: ["0% 0%", "300% 0%"] }}
                transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="ml-auto pr-6">01/09/2077</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Outer component props (public API) ──────────────────────────────

interface CyberpunkProps {
  track: EnrichedTrack | null;
  showArtwork?: boolean;
  showBackdrop?: boolean;
  showCallout?: boolean;
  showEqualizer?: boolean;
  showHolo?: boolean;
  showShadow?: boolean;
  panelColor?: string;
  paperColor?: string;
  screenColor?: string;
  textStrokeWidth?: number;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
  };
}

// ── Outer component: BaseOverlay wrapper ────────────────────────────

export function Cyberpunk({
  track,
  showArtwork,
  showBackdrop,
  showCallout,
  showEqualizer,
  showHolo,
  showShadow,
  panelColor,
  paperColor,
  screenColor,
  textStrokeWidth,
  fontFamily,
  fontSize,
}: CyberpunkProps) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: EXIT_MS, enterDuration: ENTER_MS }}
      renderTheme={(props) => (
        <CyberpunkTheme
          {...props}
          showArtwork={showArtwork}
          showBackdrop={showBackdrop}
          showCallout={showCallout}
          showEqualizer={showEqualizer}
          showHolo={showHolo}
          showShadow={showShadow}
          panelColor={panelColor}
          paperColor={paperColor}
          screenColor={screenColor}
          textStrokeWidth={textStrokeWidth}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}
