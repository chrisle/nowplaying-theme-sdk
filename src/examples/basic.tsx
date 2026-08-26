import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";
import type { ThemeMeta } from "../theme";

/**
 * The smallest theme worth reading: three lines of text, one fade. Start here
 * if `clean.tsx` is more than you need — copy this file into `src/themes/` and
 * change `meta.id` to make it your own.
 */
export const meta: ThemeMeta = {
  id: "basic",
  name: "Basic",
  description: "Clean text-based overlay",
  width: 800,
  height: 120,
  fields: [
    {
      key: "textColor",
      label: "Text Color",
      type: "color",
      defaultValue: "#ffffff",
    },
    {
      key: "backgroundColor",
      label: "Background Color",
      type: "color",
      defaultValue: "#000000",
    },
    {
      key: "fontFamily",
      label: "Font Family",
      type: "string",
      defaultValue: "Helvetica Neue, system-ui, sans-serif",
    },
    {
      key: "fontSize.title",
      label: "Title Size",
      type: "number",
      defaultValue: 40,
      min: 10,
      max: 120,
    },
    {
      key: "fontSize.artist",
      label: "Artist Size",
      type: "number",
      defaultValue: 30,
      min: 10,
      max: 120,
    },
    {
      key: "fontSize.label",
      label: "Label Size",
      type: "number",
      defaultValue: 20,
      min: 10,
      max: 120,
    },
  ],
};

const FADE_DURATION = 0.5;

/** Each line waits its turn on the way back in. */
const ENTER_DELAY = {
  title: 0,
  artist: 0.2,
  label: 0.3,
};

interface BasicThemeProps {
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
    label?: number;
  };
}

/**
 * BasicTheme - Animation component for Basic theme
 */
function BasicTheme({
  title,
  artist,
  label,
  isAnimating,
  textColor = "#ffffff",
  backgroundColor = "#000000",
  fontFamily = "Helvetica Neue, system-ui, sans-serif",
  fontSize = { title: 40, artist: 30, label: 20 },
}: ThemeRenderProps & BasicThemeProps) {
  const titleControl = useAnimation();
  const artistControl = useAnimation();
  const labelControl = useAnimation();

  useEffect(() => {
    if (!isAnimating) {
      // Between track changes the text simply sits on screen.
      titleControl.start({ opacity: 1 });
      artistControl.start({ opacity: 1 });
      labelControl.start({ opacity: 1 });
      return;
    }

    const runAnimation = async () => {
      // Phase 1: fade out. BaseOverlay swaps in the new track once this ends.
      const fadeOut = { opacity: 0, transition: { duration: FADE_DURATION } };
      await Promise.all([
        titleControl.start(fadeOut),
        artistControl.start(fadeOut),
        labelControl.start(fadeOut),
      ]);

      // Phase 2: fade the new track back in, one line after another.
      await Promise.all([
        titleControl.start({
          opacity: 1,
          transition: { duration: FADE_DURATION, delay: ENTER_DELAY.title },
        }),
        artistControl.start({
          opacity: 1,
          transition: { duration: FADE_DURATION, delay: ENTER_DELAY.artist },
        }),
        labelControl.start({
          opacity: 1,
          transition: { duration: FADE_DURATION, delay: ENTER_DELAY.label },
        }),
      ]);
    };

    runAnimation();
  }, [isAnimating, titleControl, artistControl, labelControl]);

  return (
    <div
      className="relative w-full p-2.5"
      style={{
        fontFamily,
        backgroundColor,
        color: textColor,
      }}
    >
      <div className="flex flex-col">
        {/* Title */}
        <motion.div
          animate={titleControl}
          initial={{ opacity: 1 }}
          style={{
            fontSize: `${fontSize.title}px`,
            lineHeight: `${fontSize.title}px`,
            fontWeight: 700,
            textTransform: "uppercase",
            color: textColor,
          }}
        >
          {title}
        </motion.div>

        {/* Artist */}
        <motion.div
          animate={artistControl}
          initial={{ opacity: 1 }}
          style={{
            fontSize: `${fontSize.artist}px`,
            lineHeight: `${fontSize.artist}px`,
            fontWeight: 400,
            textTransform: "uppercase",
            color: textColor,
          }}
        >
          {artist}
        </motion.div>

        {/* Label */}
        <motion.div
          animate={labelControl}
          initial={{ opacity: 1 }}
          className="pt-1"
          style={{
            fontSize: `${fontSize.label}px`,
            lineHeight: `${fontSize.label}px`,
            fontStyle: "italic",
            color: textColor,
          }}
        >
          {label}
        </motion.div>
      </div>
    </div>
  );
}

interface BasicProps {
  track: EnrichedTrack | null;
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: {
    title?: number;
    artist?: number;
    label?: number;
  };
}

export function Basic({
  track,
  textColor,
  backgroundColor,
  fontFamily,
  fontSize,
}: BasicProps) {
  return (
    <BaseOverlay
      track={track}
      // Long enough for the fade out, then the last line's delayed fade in.
      animationTiming={{ exitDuration: 500, enterDuration: 800 }}
      renderTheme={(props) => (
        <BasicTheme
          {...props}
          textColor={textColor}
          backgroundColor={backgroundColor}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}

export default Basic;
