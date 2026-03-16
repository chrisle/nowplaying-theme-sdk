import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";

const inCubic = [0.32, 0, 0.67, 0] as const;

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
  backgroundColor = "#000000",
  fontFamily = "Helvetica Neue",
  fontSize = { header: 40, artist: 27, title: 27, label: 25 },
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
      // Phase 1: Move left (x: -distance)
      await Promise.all([
        nowplayingControl.start({
          x: -280,
          transition: { duration: 0.5, ease: "easeOut" },
        }),
        artistControl.start({
          x: -552,
          transition: { duration: 0.5, ease: "easeOut" },
        }),
        titleControl.start({
          x: -552,
          transition: { duration: 0.5, ease: "easeOut" },
        }),
        labelControl.start({
          x: -552,
          transition: { duration: 0.5, ease: "easeOut" },
        }),
        lineControl.start({
          x: 0,
          transition: { duration: 0.5, ease: "easeOut" },
        }),
      ]);

      // Phase 2: Fade out
      await Promise.all([
        nowplayingControl.start({
          opacity: 0,
          transition: { duration: 0.75, ease: "easeOut" },
        }),
        artistControl.start({
          opacity: 0,
          transition: { duration: 0.75, ease: "easeOut" },
        }),
        titleControl.start({
          opacity: 0,
          transition: { duration: 0.75, ease: "easeOut" },
        }),
        labelControl.start({
          opacity: 0,
          transition: { duration: 0.75, ease: "easeOut" },
        }),
        lineControl.start({
          opacity: 0,
          transition: { duration: 0.75, ease: "easeOut" },
        }),
      ]);

      // Phase 3: Reset position while hidden
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
        lineControl.start({
          x: 542,
          opacity: 0,
          transition: { duration: 0, delay: 0.5 },
        }),
      ]);

      // Phase 4: Fade in at new position
      await Promise.all([
        nowplayingControl.start({
          opacity: 1,
          transition: { duration: 0, delay: 0.25 },
        }),
        artistControl.start({
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
        lineControl.start({
          opacity: 1,
          transition: { duration: 0, delay: 0.25 },
        }),
      ]);

      // Phase 5: Subtle movement sequence
      await Promise.all([
        nowplayingControl.start({
          x: 3,
          transition: { duration: 0.75, ease: "easeOut" },
        }),
        artistControl.start({
          x: -10,
          transition: { duration: 1, ease: "easeOut", delay: 0.25 },
        }),
      ]);

      // Phase 6: Final position back left
      await Promise.all([
        nowplayingControl.start({
          x: -280,
          transition: { duration: 1, ease: "easeOut" },
        }),
        artistControl.start({
          x: -552,
          transition: { duration: 1, ease: "easeOut" },
        }),
        titleControl.start({
          x: -552,
          transition: { duration: 1.5, ease: "easeOut" },
        }),
        labelControl.start({
          x: -552,
          transition: { duration: 1.5, ease: "easeOut", delay: 0.1 },
        }),
        lineControl.start({
          x: 0,
          transition: { duration: 0.8, ease: inCubic, delay: 1.2 },
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
      className="relative w-full p-2.5"
      style={{ minHeight: "200px", backgroundColor }}
    >
      <div
        className="relative"
        style={{
          fontFamily,
          marginTop: "-10px",
          color: "#ffffff",
        }}
      >
        {/* Now Playing Row */}
        <div
          className="flex overflow-hidden items-center"
          style={{
            width: "270px",
            lineHeight: "50px",
          }}
        >
          <motion.div
            animate={nowplayingControl}
            initial={{ x: -280 }}
            className="flex overflow-visible items-center whitespace-nowrap"
            style={{
              width: "542px",
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
            marginTop: "-7px",
          }}
        >
          <motion.div
            animate={artistControl}
            initial={{ x: -552 }}
            className="flex overflow-visible items-center"
            style={{
              width: "100%",
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
                color: "#ffffff",
              }}
            >
              {artist}
            </div>
          </motion.div>
        </div>

        {/* Title Row */}
        <div
          className="flex overflow-hidden items-center"
          style={{
            width: "542px",
            marginTop: "-21px",
          }}
        >
          <motion.div
            animate={titleControl}
            initial={{ x: -552 }}
            className="flex overflow-visible items-center h-[50px] mt-[2px]"
            style={{
              width: "100%",
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
                lineHeight: `${fontSize.title}px`,
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
            marginTop: "-6px",
            marginBottom: "2px",
            paddingLeft: "2px",
          }}
        >
          <motion.div
            animate={labelControl}
            initial={{ x: -552 }}
            className="flex overflow-visible items-center"
            style={{
              height: "50px",
              marginTop: "0px",
              marginLeft: "-1px",
              width: "100%",
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
                fontSize: `${fontSize.label}px`,
                lineHeight: `${fontSize.label}px`,
                fontStyle: "italic",
                color: "#ffffff",
              }}
            >
              {label}
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
      animationTiming={{ exitDuration: 1200, enterDuration: 1200 }}
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
