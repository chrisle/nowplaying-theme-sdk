import { EnrichedTrack } from "../types";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { BaseOverlay, ThemeRenderProps } from "../components/base-overlay";

// Custom easing for kinetik3d animations
const customEase = [0.19, 1, 0.22, 1] as const;

interface Kinetik3DThemeProps {
  redColor?: string;
  greenColor?: string;
  blueColor?: string;
  overlayColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  artistFontSize?: number;
  speed?: number;
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
  backgroundColor = "transparent",
  fontFamily = "'Mukta Mahee', sans-serif",
  fontSize = 50,
  artistFontSize = 40,
  speed = 1,
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

  const titleControls = [titleRControl, titleGControl, titleBControl, titleO1Control, titleO2Control];
  const artistControls = [artistRControl, artistGControl, artistBControl, artistO1Control, artistO2Control];
  const s = Math.max(speed, 0.01);
  const dur = 0.5 / s;
  const staggerDelays = [0, 0.1, 0.15, 0.2, 0.25].map((d) => d / s);

  useEffect(() => {
    if (isAnimating) {
      // EXIT: Rotate to 90° (text becomes edge-on / invisible)
      const runExit = async () => {
        await Promise.all(
          titleControls.flatMap((ctrl, i) => [
            ctrl.start({
              rotateY: 90,
              transition: { duration: dur, ease: customEase, delay: staggerDelays[i] },
            }),
          ]).concat(
            artistControls.flatMap((ctrl, i) => [
              ctrl.start({
                rotateY: -90,
                transition: { duration: dur, ease: customEase, delay: staggerDelays[i] },
              }),
            ])
          )
        );
      };
      runExit();
    } else {
      // ENTER: Rotate from 90° back to 0° (reveals new text)
      const runEnter = async () => {
        // Ensure we start at 90° (edge-on, invisible)
        await Promise.all(
          titleControls.map((ctrl) =>
            ctrl.start({ rotateY: 90, transition: { duration: 0 } })
          ).concat(
            artistControls.map((ctrl) =>
              ctrl.start({ rotateY: -90, transition: { duration: 0 } })
            )
          )
        );

        // Rotate back to 0° with stagger (text appears with new content)
        await Promise.all(
          titleControls.flatMap((ctrl, i) => [
            ctrl.start({
              rotateY: 0,
              transition: { duration: dur, ease: customEase, delay: staggerDelays[i] },
            }),
          ]).concat(
            artistControls.flatMap((ctrl, i) => [
              ctrl.start({
                rotateY: 0,
                transition: { duration: dur, ease: customEase, delay: staggerDelays[i] },
              }),
            ])
          )
        );
      };
      runEnter();
    }
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
      className="relative w-full flex flex-col justify-center items-center h-full overflow-hidden"
      style={{ backgroundColor, fontFamily, textTransform: "uppercase" as const }}
    >
      <style>{`
        .kinetik3d-o {
          color: transparent !important;
          -webkit-text-stroke: 1px ${overlayColor};
        }
      `}</style>

      <div className="flex flex-col w-full h-full justify-center items-center">
        {/* Title Layer */}
        <div
          style={{
            display: "grid",
            placeItems: "center",
            perspective: "1000px",
          }}
        >
          <motion.h1
            animate={titleRControl}
            initial={{ z: 0, rotateY: 0 }}
            className="font-bold"
            style={{
              gridArea: "1 / 1",
              fontSize: `${fontSize}px`,
              color: redColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </motion.h1>
          <motion.h1
            animate={titleGControl}
            initial={{ z: 0, rotateY: 0 }}
            className="font-bold"
            style={{
              gridArea: "1 / 1",
              fontSize: `${fontSize}px`,
              color: greenColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </motion.h1>
          <motion.h1
            animate={titleBControl}
            initial={{ z: 0, rotateY: 0 }}
            className="font-bold"
            style={{
              gridArea: "1 / 1",
              fontSize: `${fontSize}px`,
              color: blueColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </motion.h1>
          <motion.h1
            animate={titleO1Control}
            initial={{ z: 0, rotateY: 0 }}
            className="font-bold kinetik3d-o"
            style={{
              gridArea: "1 / 1",
              fontSize: `${fontSize}px`,
              opacity: 0.65,
              color: overlayColor,
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </motion.h1>
          <motion.h1
            animate={titleO2Control}
            initial={{ z: 0, rotateY: 0 }}
            className="font-bold kinetik3d-o"
            style={{
              gridArea: "1 / 1",
              fontSize: `${fontSize}px`,
              opacity: 0.4,
              color: overlayColor,
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </motion.h1>
        </div>

        {/* Artist Layer */}
        <div
          style={{
            display: "grid",
            placeItems: "center",
            perspective: "1000px",
            marginTop: "-20px",
          }}
        >
          <motion.h2
            animate={artistRControl}
            initial={{ z: 0, rotateY: 0 }}
            style={{
              gridArea: "1 / 1",
              fontSize: `${artistFontSize}px`,
              fontWeight: 400,
              color: redColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {artist}
          </motion.h2>
          <motion.h2
            animate={artistGControl}
            initial={{ z: 0, rotateY: 0 }}
            style={{
              gridArea: "1 / 1",
              fontSize: `${artistFontSize}px`,
              fontWeight: 400,
              color: greenColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {artist}
          </motion.h2>
          <motion.h2
            animate={artistBControl}
            initial={{ z: 0, rotateY: 0 }}
            style={{
              gridArea: "1 / 1",
              fontSize: `${artistFontSize}px`,
              fontWeight: 400,
              color: blueColor,
              mixBlendMode: "screen",
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {artist}
          </motion.h2>
          <motion.h2
            animate={artistO1Control}
            initial={{ z: 0, rotateY: 0 }}
            className="kinetik3d-o"
            style={{
              gridArea: "1 / 1",
              fontSize: `${artistFontSize}px`,
              fontWeight: 400,
              opacity: 0.65,
              color: overlayColor,
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
            }}
          >
            {artist}
          </motion.h2>
          <motion.h2
            animate={artistO2Control}
            initial={{ z: 0, rotateY: 0 }}
            className="kinetik3d-o"
            style={{
              gridArea: "1 / 1",
              fontSize: `${artistFontSize}px`,
              fontWeight: 400,
              opacity: 0.4,
              color: overlayColor,
              transformStyle: "preserve-3d",
              whiteSpace: "nowrap",
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
  artistFontSize?: number;
  speed?: number;
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
  artistFontSize,
  speed = 1,
}: Kinetik3DProps) {
  return (
    <BaseOverlay
      track={track}
      animationTiming={{ exitDuration: Math.round(750 / Math.max(speed, 0.01)), enterDuration: 50 }}
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
          artistFontSize={artistFontSize}
          speed={speed}
        />
      )}
    />
  );
}
