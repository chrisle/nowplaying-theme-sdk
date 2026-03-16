import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";

interface Asot2K3ThemeProps {
  lineColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: {
    header?: number;
    artist?: number;
    title?: number;
    label?: number;
  };
}

/**
 * Asot2K3Theme - Animation component for Asot2K3 theme
 */
function Asot2K3Theme({
  title,
  artist,
  label,
  isAnimating,
  lineColor = "#ffffff",
  backgroundColor = "transparent",
  fontFamily = "Helvetica Neue",
  fontSize = { header: 40, artist: 30, title: 30, label: 24 },
}: ThemeRenderProps & Asot2K3ThemeProps) {
  const nowplayingControl = useAnimation();
  const artistControl = useAnimation();
  const titleControl = useAnimation();
  const labelControl = useAnimation();
  const lineControl = useAnimation();

  useEffect(() => {
    if (!isAnimating) {
      // Reset to initial positions
      nowplayingControl.start({ x: -280, opacity: 1 });
      artistControl.start({ x: -552, opacity: 1 });
      titleControl.start({ x: -552, opacity: 1 });
      labelControl.start({ x: -552, opacity: 1 });
      lineControl.start({ x: 0, opacity: 1 });
      return;
    }

    const runAnimation = async () => {
      // GROUP 0: Slide left to resting position
      await Promise.all([
        nowplayingControl.start({
          x: -280,
          transition: { duration: 0.5 },
        }),
        artistControl.start({
          x: -552,
          transition: { duration: 0.5 },
        }),
        lineControl.start({
          x: 0,
          transition: { duration: 0.5 },
        }),
      ]);

      // GROUP 1: Fade out all elements
      await Promise.all([
        nowplayingControl.start({
          opacity: 0,
          transition: { duration: 0.25 },
        }),
        artistControl.start({
          opacity: 0,
          transition: { duration: 0.25 },
        }),
        lineControl.start({
          opacity: 0,
          transition: { duration: 0.25 },
        }),
        titleControl.start({
          opacity: 0,
          transition: { duration: 0.25 },
        }),
        labelControl.start({
          opacity: 0,
          transition: { duration: 0.25 },
        }),
      ]);

      // GROUP 2: Reset positions while hidden
      await Promise.all([
        nowplayingControl.start({
          x: 270,
          opacity: 0,
          transition: { duration: 0, delay: 0.5 },
        }),
        artistControl.start({
          x: 542,
          opacity: 0,
          transition: { duration: 0, delay: 0.5 },
        }),
        lineControl.start({
          x: 542,
          opacity: 0,
          transition: { duration: 0, delay: 0.5 },
        }),
        titleControl.start({
          x: 542,
          opacity: 0,
          transition: { duration: 0, delay: 0.5 },
        }),
        labelControl.start({
          x: 542,
          opacity: 0,
          transition: { duration: 0, delay: 0.5 },
        }),
      ]);

      // GROUP 3: Fade in at new positions
      await Promise.all([
        nowplayingControl.start({
          opacity: 1,
          transition: { duration: 0, delay: 0.25 },
        }),
        artistControl.start({
          opacity: 1,
          transition: { duration: 0, delay: 0.25 },
        }),
        lineControl.start({
          opacity: 1,
          transition: { duration: 0, delay: 0.25 },
        }),
        titleControl.start({
          opacity: 1,
          transition: { duration: 0, delay: 0.25 },
        }),
        labelControl.start({
          opacity: 1,
          transition: { duration: 0, delay: 0.25 },
        }),
      ]);

      // GROUP 4: Subtle movement - elements drift in from right
      await Promise.all([
        nowplayingControl.start({
          x: -10,
          transition: { duration: 0.75 },
        }),
        artistControl.start({
          x: -10,
          transition: { duration: 1, delay: 0.25 },
        }),
        lineControl.start({
          x: 266,
          transition: { duration: 0.75, delay: 0.5 },
        }),
      ]);

      // GROUP 5: Slide nowplaying and artist back to rest, line returns
      await Promise.all([
        nowplayingControl.start({
          x: -280,
          transition: { duration: 1 },
        }),
        artistControl.start({
          x: -552,
          transition: { duration: 1 },
        }),
        lineControl.start({
          x: 0,
          transition: { duration: 0.5 },
        }),
      ]);

      // GROUP 6: Title and label slide into view
      await Promise.all([
        titleControl.start({
          x: 0,
          transition: { duration: 1 },
        }),
        labelControl.start({
          x: 0,
          transition: { duration: 1, delay: 0.1 },
        }),
      ]);

      // GROUP 7: Title and label exit back left
      await Promise.all([
        titleControl.start({
          x: -552,
          transition: { duration: 0.75 },
        }),
        labelControl.start({
          x: -552,
          transition: { duration: 0.75, delay: 0.05 },
        }),
      ]);
    };

    runAnimation();
  }, [
    isAnimating,
    nowplayingControl,
    artistControl,
    titleControl,
    labelControl,
    lineControl,
  ]);

  return (
    <div
      className="relative w-full"
      style={{ backgroundColor }}
    >
      <div
        className="flex flex-col"
        style={{
          fontFamily,
          color: "#ffffff",
        }}
      >
        {/* Now Playing Row */}
        <div
          className="flex overflow-hidden items-center"
          style={{
            width: "270px",
            height: "50px",
            paddingLeft: "2px",
          }}
        >
          <motion.div
            animate={nowplayingControl}
            initial={{ x: -280 }}
            className="flex overflow-visible items-center whitespace-nowrap"
            style={{
              marginTop: "5px",
              marginLeft: "-3px",
            }}
          >
            <div
              className="flex-shrink-0"
              style={{
                width: "270px",
                height: "3px",
                marginRight: "10px",
                backgroundColor: lineColor,
              }}
            />
            <div
              style={{
                fontSize: `${fontSize.header}px`,
                fontWeight: "500",
                letterSpacing: "-0.034em",
                whiteSpace: "nowrap",
                color: "#ffffff",
              }}
            >
              Now Playing
            </div>
          </motion.div>
        </div>

        {/* Artist Row */}
        <div
          className="flex overflow-hidden items-center"
          style={{
            width: "542px",
            height: "50px",
            marginTop: "-5px",
            marginBottom: "2px",
            paddingLeft: "2px",
          }}
        >
          <motion.div
            animate={artistControl}
            initial={{ x: -552 }}
            className="flex overflow-visible items-center"
            style={{
              marginLeft: "-1px",
            }}
          >
            <div
              className="flex-shrink-0"
              style={{
                width: "542px",
                height: "3px",
                marginRight: "10px",
                backgroundColor: lineColor,
              }}
            />
            <div
              style={{
                fontSize: `${fontSize.artist}px`,
                letterSpacing: "-0.016em",
                lineHeight: "36px",
                marginTop: "7px",
                marginBottom: "7px",
                whiteSpace: "nowrap",
                color: "#ffffff",
              }}
            >
              {artist}
            </div>
          </motion.div>
        </div>

        {/* Divider Line */}
        <div
          className="flex overflow-hidden items-center"
          style={{
            width: "542px",
            height: "10px",
          }}
        >
          <motion.div
            animate={lineControl}
            initial={{ x: 0 }}
            style={{
              width: "542px",
              height: "3px",
              backgroundColor: lineColor,
            }}
          />
        </div>

        {/* Title Row */}
        <div
          className="flex overflow-hidden items-center"
          style={{
            width: "542px",
            height: "50px",
            paddingLeft: "2px",
          }}
        >
          <motion.div
            animate={titleControl}
            initial={{ x: -552 }}
            className="flex overflow-visible items-center"
            style={{
              marginTop: "2px",
            }}
          >
            <div
              className="flex-shrink-0"
              style={{
                width: "542px",
                height: "3px",
                marginRight: "10px",
                backgroundColor: lineColor,
              }}
            />
            <div
              style={{
                fontSize: `${fontSize.title}px`,
                letterSpacing: "-0.016em",
                lineHeight: "44px",
                marginBottom: "6px",
                whiteSpace: "nowrap",
                color: "#ffffff",
              }}
            >
              {title}
            </div>
          </motion.div>
        </div>

        {/* Label Row */}
        <div
          className="flex overflow-hidden items-center"
          style={{
            width: "542px",
            height: "30px",
            paddingLeft: "2px",
          }}
        >
          <motion.div
            animate={labelControl}
            initial={{ x: -552 }}
            className="flex overflow-visible items-center"
          >
            <div
              className="flex-shrink-0"
              style={{
                width: "542px",
                height: "3px",
                marginRight: "10px",
                backgroundColor: lineColor,
              }}
            />
            <div
              style={{
                fontSize: `${fontSize.label}px`,
                lineHeight: `${fontSize.label}px`,
                fontStyle: "italic",
                whiteSpace: "nowrap",
                color: "#ffffff",
              }}
            >
              {label}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

interface Asot2K3Props {
  track: EnrichedTrack | null;
  lineColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: {
    header?: number;
    artist?: number;
    title?: number;
    label?: number;
  };
}

export function Asot2K3({
  track,
  lineColor,
  backgroundColor,
  fontFamily,
  fontSize,
}: Asot2K3Props) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: 1500, enterDuration: 4000 }}
      renderTheme={(props) => (
        <Asot2K3Theme
          {...props}
          lineColor={lineColor}
          backgroundColor={backgroundColor}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}
