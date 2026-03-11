import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";
import { AlbumArt } from "../components/album-art";

// Easing functions from devlink (cubic bezier)
const easeInCubic = [0.32, 0, 0.67, 0] as const;
const easeOutCubic = [0.33, 1, 0.68, 1] as const;

const ANIMATION_CONFIG = {
  label: { exitDelay: 0, enterDelay: 0.4 },
  title: { exitDelay: 0.2, enterDelay: 0.3 },
  artist: { exitDelay: 0.3, enterDelay: 0.2 },
  line: { exitDelay: 0.4, enterDelay: 0 },
  album: { exitDelay: 0.4, enterDelay: 0 },
};

const EXIT_DURATION = 1;
const ENTER_DURATION = 1;

interface CleanThemeProps {
  showArtwork?: boolean;
  alignRight?: boolean;
  animateUp?: boolean;
  lineColor?: string;
  textColor?: string;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: {
    artist?: number;
    title?: number;
    label?: number;
  };
}

/**
 * CleanTheme - Animation component for Clean theme
 */
function CleanTheme({
  title,
  artist,
  label,
  artwork,
  isAnimating,
  showArtwork = true,
  alignRight = false,
  animateUp = false,
  lineColor = "#ff0000",
  textColor = "#fff",
  textStrokeColor = "#000",
  textStrokeWidth = 2,
  backgroundColor = "transparent",
  fontFamily = "Rubik, system-ui, sans-serif",
  fontSize = { artist: 40, title: 50, label: 30 },
}: ThemeRenderProps & CleanThemeProps) {
  // Create text stroke style using text-shadow for cross-browser support
  const textStrokeStyle =
    textStrokeWidth > 0
      ? {
          textShadow: `
      -${textStrokeWidth}px -${textStrokeWidth}px 0 ${textStrokeColor},
      ${textStrokeWidth}px -${textStrokeWidth}px 0 ${textStrokeColor},
      -${textStrokeWidth}px ${textStrokeWidth}px 0 ${textStrokeColor},
      ${textStrokeWidth}px ${textStrokeWidth}px 0 ${textStrokeColor},
      0 -${textStrokeWidth}px 0 ${textStrokeColor},
      0 ${textStrokeWidth}px 0 ${textStrokeColor},
      -${textStrokeWidth}px 0 0 ${textStrokeColor},
      ${textStrokeWidth}px 0 0 ${textStrokeColor}
    `,
        }
      : {};
  const labelControls = useAnimation();
  const titleControls = useAnimation();
  const artistControls = useAnimation();
  const lineControls = useAnimation();
  const albumControls = useAnimation();

  useEffect(() => {
    if (!isAnimating) {
      labelControls.start({ y: 0 });
      titleControls.start({ y: 0 });
      artistControls.start({ y: 0 });
      lineControls.start({ y: 0 });
      albumControls.start({ y: 0 });
      return;
    }

    const exitY = animateUp ? -300 : 300;

    // When animating up, reverse the stagger order for text elements
    const timing = animateUp
      ? {
          label: { exitDelay: ANIMATION_CONFIG.artist.exitDelay, enterDelay: ANIMATION_CONFIG.artist.enterDelay },
          title: { exitDelay: ANIMATION_CONFIG.title.exitDelay, enterDelay: ANIMATION_CONFIG.title.enterDelay },
          artist: { exitDelay: ANIMATION_CONFIG.label.exitDelay, enterDelay: ANIMATION_CONFIG.label.enterDelay },
          line: ANIMATION_CONFIG.line,
          album: ANIMATION_CONFIG.album,
        }
      : ANIMATION_CONFIG;

    const runAnimation = async () => {
      // Phase 1: Exit animation (all elements move off-screen)
      const exitPromises = [
        labelControls.start({
          y: exitY,
          transition: {
            duration: EXIT_DURATION,
            ease: easeInCubic,
            delay: timing.label.exitDelay,
          },
        }),
        titleControls.start({
          y: exitY,
          transition: {
            duration: EXIT_DURATION,
            ease: easeInCubic,
            delay: timing.title.exitDelay,
          },
        }),
        artistControls.start({
          y: exitY,
          transition: {
            duration: EXIT_DURATION,
            ease: easeInCubic,
            delay: timing.artist.exitDelay,
          },
        }),
        lineControls.start({
          y: exitY,
          transition: {
            duration: EXIT_DURATION,
            ease: easeInCubic,
            delay: timing.line.exitDelay,
          },
        }),
        albumControls.start({
          y: exitY,
          transition: {
            duration: EXIT_DURATION,
            ease: easeInCubic,
            delay: timing.album.exitDelay,
          },
        }),
      ];

      await Promise.all(exitPromises);

      // Phase 2: Enter animation (all elements move back to y:0)
      const enterPromises = [
        labelControls.start({
          y: 0,
          transition: {
            duration: ENTER_DURATION,
            ease: easeOutCubic,
            delay: timing.label.enterDelay,
          },
        }),
        titleControls.start({
          y: 0,
          transition: {
            duration: ENTER_DURATION,
            ease: easeOutCubic,
            delay: timing.title.enterDelay,
          },
        }),
        artistControls.start({
          y: 0,
          transition: {
            duration: ENTER_DURATION,
            ease: easeOutCubic,
            delay: timing.artist.enterDelay,
          },
        }),
        lineControls.start({
          y: 0,
          transition: {
            duration: ENTER_DURATION,
            ease: easeOutCubic,
            delay: timing.line.enterDelay,
          },
        }),
        albumControls.start({
          y: 0,
          transition: {
            duration: ENTER_DURATION,
            ease: easeOutCubic,
            delay: timing.album.enterDelay,
          },
        }),
      ];

      await Promise.all(enterPromises);
    };

    runAnimation();
  }, [
    isAnimating,
    animateUp,
    labelControls,
    titleControls,
    artistControls,
    lineControls,
    albumControls,
  ]);

  return (
    <motion.div
      className={`relative flex items-center overflow-hidden p-2.5 ${alignRight ? "justify-end" : "justify-start"}`}
      style={{
        fontFamily,
        letterSpacing: "-0.05em",
        backgroundColor,
        color: textColor,
      }}
    >
      {/* Album artwork */}
      {showArtwork && (
        <motion.div
          className="flex-shrink-0"
          style={{ order: alignRight ? 1 : -1 }}
          animate={albumControls}
          initial={{ y: 0 }}
        >
          <AlbumArt src={artwork} size="xl" />
        </motion.div>
      )}

      {/* Decorative line */}
      <motion.div
        className="w-2.5 h-[150px] mx-2.5"
        style={{ backgroundColor: lineColor }}
        animate={lineControls}
        initial={{ y: 0 }}
      />

      {/* Title wrapper */}
      <div className={`flex flex-col ${alignRight ? "text-right" : "text-left"}`} style={{ order: alignRight ? -1 : 1 }}>
        {/* Artist */}
        <motion.div
          style={{
            fontSize: `${fontSize.artist}px`,
            lineHeight: `${fontSize.artist}px`,
            fontWeight: 300,
            textTransform: "uppercase",
            color: textColor,
            ...textStrokeStyle,
          }}
          animate={artistControls}
          initial={{ y: 0 }}
        >
          {artist}
        </motion.div>

        {/* Title */}
        <motion.div
          style={{
            fontSize: `${fontSize.title}px`,
            lineHeight: `${fontSize.title}px`,
            fontWeight: 500,
            textTransform: "uppercase",
            color: textColor,
            ...textStrokeStyle,
          }}
          animate={titleControls}
          initial={{ y: 0 }}
        >
          {title}
        </motion.div>

        {/* Label */}
        <motion.div
          style={{
            fontSize: `${fontSize.label}px`,
            lineHeight: `${fontSize.label}px`,
            fontWeight: 300,
            textTransform: "uppercase",
            paddingTop: "5px",
            color: textColor,
            ...textStrokeStyle,
          }}
          animate={labelControls}
          initial={{ y: 0 }}
        >
          {label}
        </motion.div>
      </div>
    </motion.div>
  );
}

interface CleanProps {
  track: EnrichedTrack | null;
  showArtwork?: boolean;
  alignRight?: boolean;
  animateUp?: boolean;
  lineColor?: string;
  textColor?: string;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: {
    artist?: number;
    title?: number;
    label?: number;
  };
}

export function Clean({
  track,
  showArtwork,
  alignRight,
  animateUp,
  lineColor,
  textColor,
  textStrokeColor,
  textStrokeWidth,
  backgroundColor,
  fontFamily,
  fontSize,
}: CleanProps) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: 1300, enterDuration: 1400 }}
      renderTheme={(props) => (
        <CleanTheme
          {...props}
          showArtwork={showArtwork}
          alignRight={alignRight}
          animateUp={animateUp}
          lineColor={lineColor}
          textColor={textColor}
          textStrokeColor={textStrokeColor}
          textStrokeWidth={textStrokeWidth}
          backgroundColor={backgroundColor}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}
