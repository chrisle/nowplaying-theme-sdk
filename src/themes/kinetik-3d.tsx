import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";

// Custom easing for kinetik3d animations
const customEase = [0.19, 1, 0.22, 1] as const;
const inOutExpo = "easeInOut" as const;

interface Kinetik3DThemeProps {
  redColor?: string;
  greenColor?: string;
  blueColor?: string;
  overlayColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

/**
 * Kinetik3DTheme - Animation component for Kinetik3D theme
 */
function Kinetik3DTheme({
  title,
  artist,
  isAnimating,
  redColor = "hsla(0, 100.00%, 50.00%, 1.00)",
  greenColor = "lime",
  blueColor = "blue",
  overlayColor = "white",
  backgroundColor = "black",
  fontFamily = "Arial, sans-serif",
  fontSize = 50,
}: ThemeRenderProps & Kinetik3DThemeProps) {
  // Title layer controls (R, G, B, O1, O2)
  const titleRControl = useAnimation();
  const titleGControl = useAnimation();
  const titleBControl = useAnimation();
  const titleO1Control = useAnimation();
  const titleO2Control = useAnimation();

  // Artist layer controls (R, G, B, O1, O2)
  const artistRControl = useAnimation();
  const artistGControl = useAnimation();
  const artistBControl = useAnimation();
  const artistO1Control = useAnimation();
  const artistO2Control = useAnimation();

  useEffect(() => {
    if (!isAnimating) {
      // Reset all to initial state
      [
        titleRControl,
        titleGControl,
        titleBControl,
        titleO1Control,
        titleO2Control,
        artistRControl,
        artistGControl,
        artistBControl,
        artistO1Control,
        artistO2Control,
      ].forEach((control) => {
        control.start({ z: 0, rotateY: 0 });
      });
      return;
    }

    const runAnimation = async () => {
      // Phase 1: Reset to z=100 (move forward)
      await Promise.all([
        titleRControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        titleGControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        titleBControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        titleO1Control.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        titleO2Control.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        artistRControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        artistGControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        artistBControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        artistO1Control.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
        artistO2Control.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo },
        }),
      ]);

      // Phase 2: Move back to z=0
      await Promise.all([
        titleRControl.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        titleGControl.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        titleBControl.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        titleO1Control.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        titleO2Control.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        artistRControl.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        artistGControl.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        artistBControl.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        artistO1Control.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
        artistO2Control.start({
          z: 0,
          transition: { duration: 0.2, ease: inOutExpo },
        }),
      ]);

      // Phase 3: Rotate Y with staggered delays
      await Promise.all([
        titleRControl.start({
          rotateY: 90,
          transition: { duration: 0.5, ease: customEase },
        }),
        artistRControl.start({
          rotateY: -90,
          transition: { duration: 0.5, ease: customEase },
        }),
        titleGControl.start({
          rotateY: 90,
          transition: { duration: 0.5, ease: customEase, delay: 0.1 },
        }),
        artistGControl.start({
          rotateY: -90,
          transition: { duration: 0.5, ease: customEase, delay: 0.1 },
        }),
        titleBControl.start({
          rotateY: 90,
          transition: { duration: 0.5, ease: customEase, delay: 0.15 },
        }),
        artistBControl.start({
          rotateY: -90,
          transition: { duration: 0.5, ease: customEase, delay: 0.15 },
        }),
        titleO1Control.start({
          rotateY: 90,
          transition: { duration: 0.5, ease: customEase, delay: 0.2 },
        }),
        artistO1Control.start({
          rotateY: -90,
          transition: { duration: 0.5, ease: customEase, delay: 0.2 },
        }),
        titleO2Control.start({
          rotateY: 90,
          transition: { duration: 0.5, ease: customEase, delay: 0.25 },
        }),
        artistO2Control.start({
          rotateY: -90,
          transition: { duration: 0.5, ease: customEase, delay: 0.25 },
        }),
      ]);

      // Phase 4: Rotate back to Y=0
      await Promise.all([
        titleRControl.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase },
        }),
        artistRControl.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase },
        }),
        titleGControl.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase, delay: 0.1 },
        }),
        artistGControl.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase, delay: 0.1 },
        }),
        titleBControl.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase, delay: 0.15 },
        }),
        artistBControl.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase, delay: 0.15 },
        }),
        titleO1Control.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase, delay: 0.2 },
        }),
        artistO1Control.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase, delay: 0.2 },
        }),
        titleO2Control.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase, delay: 0.25 },
        }),
        artistO2Control.start({
          rotateY: 0,
          transition: { duration: 0.5, ease: customEase, delay: 0.25 },
        }),
      ]);

      // Phase 5: Final zoom out
      await Promise.all([
        titleRControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0 },
        }),
        titleGControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0.1 },
        }),
        titleBControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0.15 },
        }),
        titleO1Control.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0.2 },
        }),
        titleO2Control.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0.25 },
        }),
        artistRControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0 },
        }),
        artistGControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0.1 },
        }),
        artistBControl.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0.15 },
        }),
        artistO1Control.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0.2 },
        }),
        artistO2Control.start({
          z: 100,
          transition: { duration: 0.4, ease: inOutExpo, delay: 0.25 },
        }),
      ]);
    };

    runAnimation();
  }, [
    isAnimating,
    titleRControl,
    titleGControl,
    titleBControl,
    titleO1Control,
    titleO2Control,
    artistRControl,
    artistGControl,
    artistBControl,
    artistO1Control,
    artistO2Control,
  ]);

  return (
    <div
      className="relative w-full flex flex-col justify-center items-center min-h-screen"
      style={{ backgroundColor, fontFamily }}
    >
      <style>{`
        .kinetik3d-o {
          color: transparent !important;
          -webkit-text-stroke: 1px ${overlayColor};
        }
      `}</style>

      <div className="flex flex-col w-screen h-screen justify-center items-center">
        {/* Title Layer */}
        <div
          className="flex flex-col justify-center items-center"
          style={{
            perspective: "1000px",
            transformStyle: "preserve-3d",
          }}
        >
          <motion.h1
            animate={titleRControl}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold"
            style={{
              fontSize: `${fontSize}px`,
              color: redColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
            }}
          >
            {title}
          </motion.h1>
          <motion.h1
            animate={titleGControl}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold"
            style={{
              fontSize: `${fontSize}px`,
              color: greenColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
            }}
          >
            {title}
          </motion.h1>
          <motion.h1
            animate={titleBControl}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold"
            style={{
              fontSize: `${fontSize}px`,
              color: blueColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
            }}
          >
            {title}
          </motion.h1>
          <motion.h1
            animate={titleO1Control}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold kinetik3d-o"
            style={{
              fontSize: `${fontSize}px`,
              opacity: 0.65,
              color: overlayColor,
              transformStyle: "preserve-3d",
            }}
          >
            {title}
          </motion.h1>
          <motion.h1
            animate={titleO2Control}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold kinetik3d-o"
            style={{
              fontSize: `${fontSize}px`,
              opacity: 0.4,
              color: overlayColor,
              transformStyle: "preserve-3d",
            }}
          >
            Now Playing
          </motion.h1>
        </div>

        {/* Artist Layer */}
        <div
          className="flex flex-col justify-center items-center mt-[44px]"
          style={{
            perspective: "1000px",
            transformStyle: "preserve-3d",
          }}
        >
          <motion.h2
            animate={artistRControl}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold"
            style={{
              fontSize: `${fontSize}px`,
              color: redColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
            }}
          >
            {artist}
          </motion.h2>
          <motion.h2
            animate={artistGControl}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold"
            style={{
              fontSize: `${fontSize}px`,
              color: greenColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
            }}
          >
            {artist}
          </motion.h2>
          <motion.h2
            animate={artistBControl}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold"
            style={{
              fontSize: `${fontSize}px`,
              color: blueColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
            }}
          >
            {artist}
          </motion.h2>
          <motion.h2
            animate={artistO1Control}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold kinetik3d-o"
            style={{
              fontSize: `${fontSize}px`,
              opacity: 0.65,
              color: overlayColor,
              transformStyle: "preserve-3d",
            }}
          >
            {artist}
          </motion.h2>
          <motion.h2
            animate={artistO2Control}
            initial={{ z: 0, rotateY: 0 }}
            className="absolute font-bold kinetik3d-o"
            style={{
              fontSize: `${fontSize}px`,
              opacity: 0.4,
              color: overlayColor,
              transformStyle: "preserve-3d",
            }}
          >
            {artist}
          </motion.h2>
        </div>
      </div>
    </div>
  );
}

interface Kinetik3DProps {
  track: EnrichedTrack | null;
  redColor?: string;
  greenColor?: string;
  blueColor?: string;
  overlayColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export function Kinetik3D({
  track,
  redColor,
  greenColor,
  blueColor,
  overlayColor,
  backgroundColor,
  fontFamily,
  fontSize,
}: Kinetik3DProps) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: 1750, enterDuration: 1750 }}
      renderTheme={(props) => (
        <Kinetik3DTheme
          {...props}
          redColor={redColor}
          greenColor={greenColor}
          blueColor={blueColor}
          overlayColor={overlayColor}
          backgroundColor={backgroundColor}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      )}
    />
  );
}
