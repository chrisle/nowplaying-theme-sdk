import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";
import { AlbumArt } from "../components/album-art";

// ── Animation config ────────────────────────────────────────────────

const EXIT_DURATION = 0.4;
const ENTER_DURATION = 0.5;
const STAGGER = 0.06;
// BaseOverlay lifecycle budgets (ms): must cover duration + max stagger,
// plus the decode-in which runs ~0.7s after the track data swaps.
const EXIT_MS = 650;
const ENTER_MS = 1050;

const MONO_FONT = "'Share Tech Mono', 'JetBrains Mono', ui-monospace, monospace";

// Self-hosted nothing — the HUD fonts load from Google Fonts at runtime so the
// theme works both in the playground and inside a bundled overlay iframe.
const FONT_LINK_ID = "np3-cyberpunk-fonts";
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Chakra+Petch:wght@500;600&family=Share+Tech+Mono&display=swap";

// Notched-corner panel, straight out of the CP2077 menu chrome
const PANEL_CLIP =
  "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))";

const ART_CLIP =
  "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";

// Glitch keyframe helpers — jittery x/skew with opacity flicker,
// mimicking the CP2077 HUD's signal-interference transitions.
const glitchOut = (delay: number) => ({
  opacity: [1, 0.3, 0.85, 0.1, 0.5, 0],
  x: [0, -6, 8, -14, 5, 20],
  skewX: [0, -8, 6, -14, 4, 0],
  transition: {
    duration: EXIT_DURATION,
    delay,
    times: [0, 0.2, 0.35, 0.55, 0.75, 1],
    ease: "linear" as const,
  },
});

const glitchIn = (delay: number) => ({
  opacity: [0, 0.5, 0.1, 0.9, 0.4, 1],
  x: [24, -10, 6, -3, 1, 0],
  skewX: [12, -6, 8, -3, 1, 0],
  transition: {
    duration: ENTER_DURATION,
    delay,
    times: [0, 0.15, 0.3, 0.5, 0.75, 1],
    ease: "linear" as const,
  },
});

const REST = { opacity: 1, x: 0, skewX: 0 };

type Phase = "rest" | "exit" | "enter";

/**
 * Append an alpha byte to a 6-digit hex color. Anything else (named colors,
 * partial hex typed into the playground's text input) passes through opaque
 * instead of producing an invalid CSS value.
 */
function alpha(color: string, a: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${a}` : color;
}

// ── Decode-scramble text ────────────────────────────────────────────

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&/<>*+=?!";

function randChar(): string {
  return SCRAMBLE_CHARS.charAt(
    Math.floor(Math.random() * SCRAMBLE_CHARS.length),
  );
}

/**
 * Terminal-style text that decodes character-by-character when `text` changes
 * (left to right, scramble resolving into the real string) and progressively
 * corrupts while the theme is in its exit phase.
 */
function DecodeText({
  text,
  phase,
  className,
  style,
}: {
  text: string;
  phase: Phase;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Start scrambled so the first mount plays the boot-up decode
  const [display, setDisplay] = useState(() =>
    text.split("").map((c) => (c === " " ? c : randChar())).join(""),
  );
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    // Exit phase: progressively corrupt the current string (signal loss)
    if (phase === "exit") {
      let corruption = 0;
      const id = setInterval(() => {
        corruption = Math.min(1, corruption + 0.2);
        setDisplay(
          text
            .split("")
            .map((c) =>
              c !== " " && Math.random() < corruption ? randChar() : c,
            )
            .join(""),
        );
      }, 45);
      return () => clearInterval(id);
    }

    // Enter/rest: decode toward the real text. Keyed on phase as well as text
    // so the scramble resolves even when the next track carries an identical
    // string (back-to-back songs by the same artist) — text alone wouldn't
    // re-fire and the corrupted scramble would stay on screen forever.
    if (displayRef.current === text) return;
    const chars = text.split("");
    const total = chars.length;
    const step = Math.max(1, Math.ceil(total / 20));
    let resolved = 0;
    const id = setInterval(() => {
      resolved += step;
      if (resolved >= total) {
        setDisplay(text);
        clearInterval(id);
        return;
      }
      setDisplay(
        chars
          .map((c, i) => (i < resolved || c === " " ? c : randChar()))
          .join(""),
      );
    }, 33);
    return () => clearInterval(id);
  }, [text, phase]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}

// ── Small HUD widgets ───────────────────────────────────────────────

/** Fluctuating uplink readout, pure set dressing */
function LinkTicker({ color }: { color: string }) {
  const [pct, setPct] = useState(98.2);
  useEffect(() => {
    const id = setInterval(() => setPct(96.8 + Math.random() * 3.1), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ color, fontFamily: MONO_FONT }}>
      LINK::{pct.toFixed(1)}%
    </span>
  );
}

// Deterministic pseudo-random EQ bar loops (seeded by index so renders are stable)
const EQ_BARS = Array.from({ length: 14 }, (_, i) => {
  const seq = Array.from(
    { length: 5 },
    (_, k) => 0.15 + 0.85 * Math.abs(Math.sin(i * 2.7 + k * 1.9)),
  );
  return {
    seq: [...seq, seq[0] ?? 0.15],
    duration: 1.1 + ((i * 53) % 37) / 45,
  };
});

const BARCODE_BARS = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1];

/** 4-hex-digit code derived from the track — changes with every song */
function trackHex(title: string, artist: string): string {
  let h = 0;
  const s = `${title}::${artist}`;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).slice(0, 4).toUpperCase().padStart(4, "0");
}

// ── Custom props interface (inner component) ────────────────────────

interface CyberpunkThemeProps {
  showArtwork?: boolean;
  showScanlines?: boolean;
  showEqualizer?: boolean;
  showCallout?: boolean;
  accentColor?: string;
  secondaryColor?: string;
  alertColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
  };
}

// ── Inner component: animations + rendering ─────────────────────────

function CyberpunkTheme({
  title,
  artist,
  label,
  artwork,
  isAnimating,
  showArtwork = true,
  showScanlines = true,
  showEqualizer = true,
  showCallout = true,
  accentColor = "#00f0ff",
  secondaryColor = "#fcee0a",
  alertColor = "#ff003c",
  textColor = "#eafcff",
  fontFamily = "Rajdhani, 'Chakra Petch', 'Segoe UI', system-ui, sans-serif",
  fontSize = { title: 40, artist: 24 },
}: ThemeRenderProps & CyberpunkThemeProps) {
  const artControls = useAnimation();
  const headerControls = useAnimation();
  const titleControls = useAnimation();
  const artistControls = useAnimation();
  const dataControls = useAnimation();
  const calloutControls = useAnimation();
  const burstControls = useAnimation();

  const [phase, setPhase] = useState<Phase>("rest");
  const hex = useMemo(() => trackHex(title, artist), [title, artist]);

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
      // Snap to resting position (initial load or animation complete)
      setPhase("rest");
      artControls.start(REST);
      headerControls.start(REST);
      titleControls.start(REST);
      artistControls.start(REST);
      dataControls.start({ opacity: 1, y: 0 });
      calloutControls.start("in");
      return;
    }

    const runAnimation = async () => {
      // Phase 1: Exit — corrupt the signal and glitch everything out
      setPhase("exit");
      burstControls.start("burst");
      await Promise.all([
        artControls.start(glitchOut(0)),
        headerControls.start(glitchOut(STAGGER)),
        titleControls.start(glitchOut(STAGGER * 1.5)),
        artistControls.start(glitchOut(STAGGER * 2)),
        dataControls.start({
          opacity: 0,
          y: 8,
          transition: { duration: 0.25, ease: "easeIn" },
        }),
        calloutControls.start("out"),
      ]);

      // Phase 2: Enter — re-acquire, redraw the callout, decode new data
      setPhase("enter");
      burstControls.start("burst");
      await Promise.all([
        artControls.start(glitchIn(0)),
        headerControls.start(glitchIn(STAGGER)),
        titleControls.start(glitchIn(STAGGER * 1.5)),
        artistControls.start(glitchIn(STAGGER * 2)),
        dataControls.start({
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, delay: 0.25, ease: "easeOut" },
        }),
        calloutControls.start("in"),
      ]);
    };

    runAnimation();
  }, [
    isAnimating,
    artControls,
    headerControls,
    titleControls,
    artistControls,
    dataControls,
    calloutControls,
    burstControls,
  ]);

  // Chromatic-aberration text shadow (red/cyan split)
  const rgbSplit = {
    textShadow: `2px 0 ${alpha(alertColor, "99")}, -2px 0 ${alpha(accentColor, "99")}`,
  };

  const status =
    phase === "exit"
      ? { text: "://SIGNAL_LOST — REACQ...", color: alertColor }
      : phase === "enter"
        ? { text: `://DECRYPT — 0x${hex}`, color: secondaryColor }
        : { text: "://SYNC_OK — STREAM.ACTIVE", color: alpha(accentColor, "aa") };

  return (
    <div
      className="relative inline-block max-w-full"
      style={{ paddingTop: showCallout ? 44 : 0 }}
    >
      {/* ── Leader-line callout (draws in above the panel) ── */}
      {showCallout && (
        <>
          <div
            className="pointer-events-none absolute right-10 top-[12px] z-30 flex w-[240px] items-center gap-2"
            style={{ fontFamily: MONO_FONT }}
          >
            <motion.span
              className="whitespace-nowrap text-[10px] uppercase"
              style={{ color: alpha(textColor, "cc"), letterSpacing: "0.12em" }}
              variants={{
                in: { opacity: 1, transition: { delay: 0.38, duration: 0.15 } },
                out: { opacity: 0, transition: { duration: 0.12 } },
              }}
              initial="in"
              animate={calloutControls}
            >
              TRK_ID :: 0x{hex}
            </motion.span>
            <motion.span
              className="relative h-[10px] w-[10px] flex-shrink-0 rounded-full border"
              style={{ borderColor: accentColor }}
              variants={{
                in: {
                  opacity: 1,
                  scale: 1,
                  transition: { delay: 0.3, duration: 0.15 },
                },
                out: { opacity: 0, scale: 0, transition: { duration: 0.12 } },
              }}
              initial="in"
              animate={calloutControls}
            >
              <span
                className="absolute left-1/2 top-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            </motion.span>
            <motion.span
              className="h-[2px] flex-1 origin-right"
              style={{ backgroundColor: alpha(accentColor, "bb") }}
              variants={{
                in: {
                  scaleX: 1,
                  opacity: 1,
                  transition: { delay: 0.14, duration: 0.18, ease: "easeOut" },
                },
                out: { scaleX: 0, opacity: 0, transition: { duration: 0.15 } },
              }}
              initial="in"
              animate={calloutControls}
            />
          </div>
          <motion.span
            className="pointer-events-none absolute right-10 top-[13px] z-30 w-[2px] origin-top"
            style={{ height: 32, backgroundColor: alpha(accentColor, "bb") }}
            variants={{
              in: {
                scaleY: 1,
                opacity: 1,
                transition: { duration: 0.16, ease: "easeOut" },
              },
              out: { scaleY: 0, opacity: 0, transition: { duration: 0.15 } },
            }}
            initial="in"
            animate={calloutControls}
          />
        </>
      )}

      {/* ── Main HUD panel ── */}
      <div
        className="relative flex min-w-[560px] max-w-full items-stretch gap-4 p-4 pr-6"
        style={{
          fontFamily,
          color: textColor,
          backgroundColor: "rgba(5, 11, 16, 0.85)",
          clipPath: PANEL_CLIP,
          border: `1px solid ${alpha(accentColor, "55")}`,
          boxShadow: `inset 0 0 24px ${alpha(accentColor, "22")}`,
        }}
      >
        {/* Static scanline texture */}
        {showScanlines && (
          <div
            className="pointer-events-none absolute inset-0 z-20"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 3px)",
            }}
          />
        )}

        {/* Sweeping scan band */}
        {showScanlines && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            <motion.div
              className="absolute inset-x-0 h-10"
              style={{
                background: `linear-gradient(180deg, transparent, ${alpha(accentColor, "14")}, transparent)`,
              }}
              initial={{ y: -48 }}
              animate={{ y: [-48, 320] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}

        {/* Ambient interference flicker */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-30"
          style={{
            background: `linear-gradient(90deg, ${alpha(alertColor, "22")}, transparent 30%, transparent 70%, ${alpha(accentColor, "22")})`,
            mixBlendMode: "screen",
          }}
          animate={{ opacity: [0, 0, 0.5, 0, 0, 0, 0.3, 0, 0] }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            times: [0, 0.42, 0.44, 0.46, 0.66, 0.78, 0.8, 0.82, 1],
          }}
        />

        {/* Transition glitch-slice burst */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-40"
          style={{ backgroundColor: accentColor, mixBlendMode: "screen" }}
          initial={{ opacity: 0 }}
          variants={{
            burst: {
              opacity: [0, 0.45, 0.1, 0.3, 0],
              clipPath: [
                "inset(20% 0 60% 0)",
                "inset(65% 0 20% 0)",
                "inset(35% 0 45% 0)",
                "inset(78% 0 8% 0)",
                "inset(20% 0 60% 0)",
              ],
              transition: { duration: 0.32, ease: "linear" },
            },
          }}
          animate={burstControls}
        />

        {/* Corner brackets */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-4 w-4 border-l-2 border-t-2"
          style={{ borderColor: accentColor }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 z-10 h-4 w-4 border-b-2 border-r-2"
          style={{ borderColor: accentColor }}
        />

        {/* Top edge accent line (blinks like a status LED) */}
        <motion.div
          className="pointer-events-none absolute left-4 top-0 z-10 h-[2px]"
          style={{ backgroundColor: secondaryColor, width: 90 }}
          animate={{ opacity: [1, 1, 0.25, 1], scaleX: [1, 1, 0.96, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.86, 0.92, 1] }}
        />

        {/* Left edge power rail */}
        <div
          className="pointer-events-none absolute bottom-6 left-0 top-6 z-10 w-[3px]"
          style={{
            background: `linear-gradient(180deg, ${accentColor}, ${alpha(accentColor, "11")})`,
          }}
        />

        {/* Bottom hazard stripe */}
        <div
          className="pointer-events-none absolute bottom-0 left-6 z-10 h-[5px] w-[110px]"
          style={{
            background: `repeating-linear-gradient(45deg, ${secondaryColor} 0px, ${secondaryColor} 5px, #0a0a08 5px, #0a0a08 10px)`,
          }}
        />

        {/* Album artwork in a targeting frame */}
        {showArtwork && (
          <motion.div
            className="relative z-10 flex-shrink-0 self-center"
            animate={artControls}
            initial={REST}
          >
            <div
              className="p-[3px]"
              style={{ clipPath: ART_CLIP, backgroundColor: alpha(accentColor, "66") }}
            >
              <div className="relative overflow-hidden" style={{ clipPath: ART_CLIP }}>
                <AlbumArt src={artwork} size="xl" className="!rounded-none" />
                {/* Vertical scan sweep across the art */}
                <motion.div
                  className="pointer-events-none absolute inset-y-0 w-[26px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${alpha(accentColor, "55")}, transparent)`,
                    mixBlendMode: "screen",
                  }}
                  initial={{ x: -30 }}
                  animate={{ x: [-30, 180] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
            {/* Targeting brackets around the frame */}
            <div
              className="pointer-events-none absolute -left-1 -top-1 h-3 w-3 border-l-2 border-t-2"
              style={{ borderColor: secondaryColor }}
            />
            <div
              className="pointer-events-none absolute -right-1 -top-1 h-3 w-3 border-r-2 border-t-2"
              style={{ borderColor: secondaryColor }}
            />
            <div
              className="pointer-events-none absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2"
              style={{ borderColor: secondaryColor }}
            />
            <div
              className="pointer-events-none absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2"
              style={{ borderColor: secondaryColor }}
            />
            {/* Art readout tag */}
            <div
              className="absolute bottom-1 left-1 px-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{
                backgroundColor: alertColor,
                color: "#0a0208",
                fontFamily: MONO_FONT,
              }}
            >
              IMG_SRC
            </div>
          </motion.div>
        )}

        {/* Text block */}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1">
          {/* Status header row */}
          <motion.div
            className="flex items-center gap-2"
            animate={headerControls}
            initial={REST}
          >
            <motion.span
              className="inline-block h-2 w-2 flex-shrink-0"
              style={{ backgroundColor: alertColor }}
              animate={{ opacity: [1, 1, 0.15, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.7, 0.85, 1] }}
            />
            <span
              className="text-xs font-bold uppercase"
              style={{ color: secondaryColor, letterSpacing: "0.35em" }}
            >
              Now Playing
            </span>
            <span
              className="truncate text-[11px] uppercase"
              style={{ color: status.color, fontFamily: MONO_FONT }}
            >
              {status.text}
            </span>
            <span
              className="ml-auto hidden flex-shrink-0 border px-1.5 py-px text-[10px] sm:inline"
              style={{
                color: alpha(textColor, "88"),
                borderColor: alpha(accentColor, "44"),
                fontFamily: MONO_FONT,
              }}
            >
              ID 0x{hex}
            </span>
          </motion.div>

          {/* Track title — decode-scramble terminal text */}
          <motion.div
            className="truncate font-bold uppercase leading-none"
            style={{
              fontSize: `${fontSize.title ?? 40}px`,
              letterSpacing: "0.02em",
              color: textColor,
              ...rgbSplit,
            }}
            animate={titleControls}
            initial={REST}
          >
            <DecodeText text={title} phase={phase} />
          </motion.div>

          {/* Artist row */}
          <motion.div
            className="flex items-center gap-2"
            animate={artistControls}
            initial={REST}
          >
            <span
              className="inline-block h-[2px] w-6 flex-shrink-0"
              style={{ backgroundColor: secondaryColor }}
            />
            <span
              className="truncate font-medium uppercase"
              style={{
                fontSize: `${fontSize.artist ?? 24}px`,
                lineHeight: 1.1,
                color: accentColor,
                letterSpacing: "0.12em",
                fontFamily: "'Chakra Petch', Rajdhani, system-ui, sans-serif",
              }}
            >
              <DecodeText text={artist} phase={phase} />
            </span>
            {label && (
              <span
                className="hidden flex-shrink-0 text-xs uppercase tracking-widest sm:inline"
                style={{ color: alpha(textColor, "66"), fontFamily: MONO_FONT }}
              >
                [{label}]
              </span>
            )}
          </motion.div>

          {/* Data strip: EQ + telemetry readouts */}
          <motion.div
            className="mt-1.5 flex items-center gap-3 text-[10px] uppercase"
            style={{ fontFamily: MONO_FONT }}
            animate={dataControls}
            initial={{ opacity: 1, y: 0 }}
          >
            {showEqualizer && (
              <div className="flex h-[16px] items-end gap-[2px]">
                {EQ_BARS.map((bar, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] origin-bottom"
                    style={{
                      height: "100%",
                      backgroundColor: i % 5 === 3 ? secondaryColor : accentColor,
                      opacity: 0.85,
                    }}
                    animate={{ scaleY: bar.seq }}
                    transition={{
                      duration: bar.duration,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            )}
            <span
              className="h-3 w-px flex-shrink-0"
              style={{ backgroundColor: alpha(textColor, "33") }}
            />
            <span style={{ color: alpha(textColor, "77") }}>CH_02 // 44.1kHz</span>
            <LinkTicker color={alpha(accentColor, "aa")} />
            <span className="flex items-center gap-[2px]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  style={{ color: alertColor, lineHeight: 1 }}
                  animate={{ opacity: [0.15, 1, 0.15] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                >
                  ▸
                </motion.span>
              ))}
            </span>
          </motion.div>
        </div>

        {/* Right rail: reticle, katakana, barcode */}
        <div className="relative z-10 hidden w-12 flex-shrink-0 flex-col items-center justify-between py-1 md:flex">
          {/* Rotating targeting reticle */}
          <div className="relative h-8 w-8">
            <motion.span
              className="absolute inset-0 rounded-full border border-dashed"
              style={{ borderColor: alpha(accentColor, "88") }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            <motion.span
              className="absolute inset-[5px] rounded-full border"
              style={{
                borderColor: alpha(secondaryColor, "aa"),
                borderTopColor: "transparent",
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            <span
              className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
          {/* Vertical katakana strip */}
          <span
            className="select-none text-[9px] uppercase"
            style={{
              color: alpha(textColor, "55"),
              writingMode: "vertical-rl",
              letterSpacing: "0.3em",
              fontFamily: MONO_FONT,
            }}
          >
            サイバーパンク
          </span>
          {/* Barcode */}
          <div className="flex h-[14px] items-stretch gap-[1px]">
            {BARCODE_BARS.map((w, i) => (
              <span
                key={i}
                style={{ width: w, backgroundColor: alpha(textColor, "66") }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Outer component props (public API) ──────────────────────────────

interface CyberpunkProps {
  track: EnrichedTrack | null;
  showArtwork?: boolean;
  showScanlines?: boolean;
  showEqualizer?: boolean;
  showCallout?: boolean;
  accentColor?: string;
  secondaryColor?: string;
  alertColor?: string;
  textColor?: string;
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
  showScanlines,
  showEqualizer,
  showCallout,
  accentColor,
  secondaryColor,
  alertColor,
  textColor,
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
          showScanlines={showScanlines}
          showEqualizer={showEqualizer}
          showCallout={showCallout}
          accentColor={accentColor}
          secondaryColor={secondaryColor}
          alertColor={alertColor}
          textColor={textColor}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}
