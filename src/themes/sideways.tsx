import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";

const inCubic = [0.32, 0, 0.67, 0] as const;
const inQuad = [0.11, 0, 0.5, 0] as const;

interface SidewaysThemeProps {
  titleBackgroundColor?: string;
  artistBackgroundColor?: string;
  titleTextColor?: string;
  artistTextColor?: string;
  backgroundColor?: string;
  labelTextColor?: string;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
    label?: number;
  };
}

/**
 * SidewaysTheme - Animation component for Sideways theme
 */
function SidewaysTheme({
  title,
  artist,
  label,
  isAnimating,
  titleBackgroundColor = "#ff0000",
  artistBackgroundColor = "#ffffff",
  titleTextColor = "#ffffff",
  artistTextColor = "#000000",
  backgroundColor = "transparent",
  labelTextColor = "#ffffff",
  fontFamily = "'Heebo', sans-serif",
  fontSize = { title: 38, artist: 40, label: 30 },
}: ThemeRenderProps & SidewaysThemeProps) {
  const titleControl = useAnimation();
  const artistControl = useAnimation();
  const labelControl = useAnimation();
  const wrapper1Control = useAnimation();
  const wrapper2Control = useAnimation();

  useEffect(() => {
    if (isAnimating) {
      // EXIT: Title/artist slide down, label slides up, then prep for enter
      const runExit = async () => {
        await Promise.all([
          titleControl.start({
            y: 200,
            transition: { duration: 0.5, ease: inCubic },
          }),
          artistControl.start({
            y: 200,
            transition: { duration: 0.5, ease: inCubic },
          }),
          labelControl.start({
            y: -100,
            transition: { duration: 0.5, ease: inCubic },
          }),
        ]);

        // Hide wrappers and position for enter (off-screen right)
        await Promise.all([
          wrapper1Control.start({ opacity: 0, transition: { duration: 0 } }),
          wrapper2Control.start({ opacity: 0, transition: { duration: 0 } }),
          titleControl.start({ x: "30rem", y: 0, transition: { duration: 0 } }),
          artistControl.start({ x: "40rem", y: 0, transition: { duration: 0 } }),
          labelControl.start({ y: 0, opacity: 0, transition: { duration: 0 } }),
        ]);
      };
      runExit();
    } else {
      // ENTER: Title/artist slide in from right, label fades in
      const runEnter = async () => {
        // Slide title and artist in from right
        await Promise.all([
          wrapper1Control.start({
            opacity: 1,
            transition: { duration: 0.5, ease: inCubic },
          }),
          titleControl.start({
            x: 0,
            transition: { duration: 0.65, ease: inQuad },
          }),
          artistControl.start({
            x: 0,
            transition: { duration: 0.65, ease: inQuad },
          }),
        ]);

        // Fade in label
        await Promise.all([
          wrapper2Control.start({
            opacity: 1,
            transition: { duration: 0.5, ease: inCubic },
          }),
          labelControl.start({
            opacity: 1,
            transition: { duration: 0.5, ease: inCubic },
          }),
        ]);
      };
      runEnter();
    }
  }, [
    isAnimating,
    titleControl,
    artistControl,
    labelControl,
    wrapper1Control,
    wrapper2Control,
  ]);

  return (
    <div
      className="relative w-full"
      style={{
        fontFamily,
        backgroundColor,
      }}
    >
      {/* Wrapper 1 - Title and Artist */}
      <motion.div
        animate={wrapper1Control}
        initial={{ opacity: 1 }}
        className="flex flex-col items-start overflow-hidden"
      >
        <motion.div
          animate={titleControl}
          initial={{ opacity: 1, y: 0, x: 0 }}
          style={{
            marginBottom: "0px",
            padding: "5px 6px 7px 5px",
            backgroundColor: titleBackgroundColor,
            fontSize: `${fontSize.title}px`,
            lineHeight: "44px",
            fontWeight: "900",
            letterSpacing: "1px",
            whiteSpace: "nowrap",
            color: titleTextColor,
          }}
        >
          {title}
        </motion.div>
        <motion.div
          animate={artistControl}
          initial={{ opacity: 1, y: 0, x: 0 }}
          className="mt-[2px]"
          style={{
            padding: "8px 5px 5px",
            backgroundColor: artistBackgroundColor,
            color: artistTextColor,
            fontSize: `${fontSize.artist}px`,
            lineHeight: `${fontSize.artist}px`,
            fontWeight: "900",
            letterSpacing: "1px",
            whiteSpace: "nowrap",
          }}
        >
          {artist}
        </motion.div>
      </motion.div>

      {/* Wrapper 2 - Label */}
      <motion.div
        animate={wrapper2Control}
        initial={{ opacity: 1 }}
        className="flex flex-col items-start overflow-hidden"
        style={{ marginTop: "10px" }}
      >
        <motion.div
          animate={labelControl}
          initial={{ opacity: 1, y: 0 }}
          className="flex"
          style={{
            fontSize: `${fontSize.label}px`,
            lineHeight: `${fontSize.label}px`,
            fontWeight: "300",
            whiteSpace: "nowrap",
            color: labelTextColor,
          }}
        >
          {label}
        </motion.div>
      </motion.div>
    </div>
  );
}

interface SidewaysProps {
  track: EnrichedTrack | null;
  titleBackgroundColor?: string;
  artistBackgroundColor?: string;
  titleTextColor?: string;
  artistTextColor?: string;
  backgroundColor?: string;
  labelTextColor?: string;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
    label?: number;
  };
}

export function Sideways({
  track,
  titleBackgroundColor,
  artistBackgroundColor,
  titleTextColor,
  artistTextColor,
  backgroundColor,
  labelTextColor,
  fontFamily,
  fontSize,
}: SidewaysProps) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: 550, enterDuration: 50 }}
      renderTheme={(props) => (
        <SidewaysTheme
          {...props}
          titleBackgroundColor={titleBackgroundColor}
          artistBackgroundColor={artistBackgroundColor}
          titleTextColor={titleTextColor}
          artistTextColor={artistTextColor}
          backgroundColor={backgroundColor}
          labelTextColor={labelTextColor}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}
