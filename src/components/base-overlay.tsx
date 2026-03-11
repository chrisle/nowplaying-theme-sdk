import { EnrichedTrack } from "../types";
import { ReactNode, useEffect, useState } from "react";

interface BaseOverlayProps {
  track: EnrichedTrack | null;
  renderTheme: (props: ThemeRenderProps) => ReactNode;
  animationTiming?: {
    exitDuration: number; // milliseconds for exit animation
    enterDuration: number; // milliseconds for enter animation
  };
}

export interface ThemeRenderProps {
  title: string;
  artist: string;
  label?: string;
  artwork?: string;
  isAnimating: boolean;
}

/**
 * BaseOverlay handles:
 * - Track changes with animation lifecycle
 * - Coordinates outgoing animation -> data update -> incoming animation
 */
export function BaseOverlay({
  track,
  renderTheme,
  animationTiming = { exitDuration: 1500, enterDuration: 1500 },
}: BaseOverlayProps) {
  const [displayTrack, setDisplayTrack] = useState<EnrichedTrack | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Handle initial track or track changes
    if (!track) {
      return; // No track to display
    }

    // If displayTrack is not set yet, initialize it without animation
    if (!displayTrack) {
      setDisplayTrack(track);
      return;
    }

    // If same track, no change needed
    if (track.id === displayTrack.id) {
      return;
    }

    // Start the animation cycle for track changes
    const handleTrackChange = async () => {
      setIsAnimating(true);

      // Phase 1: Wait for outgoing animation
      // Theme plays exit animation while isAnimating is true
      await new Promise((resolve) => {
        setTimeout(resolve, animationTiming.exitDuration);
      });

      // Phase 2: Update the track data
      setDisplayTrack(track);

      // Brief pause to ensure DOM update
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });

      // Phase 3: Trigger incoming animation
      // isAnimating is still true, theme plays entry animation
      await new Promise((resolve) => {
        setTimeout(resolve, animationTiming.enterDuration);
      });

      // Animation complete
      setIsAnimating(false);
    };

    handleTrackChange();
  }, [
    track,
    displayTrack?.id,
    animationTiming.exitDuration,
    animationTiming.enterDuration,
  ]);

  if (!displayTrack) {
    return (
      <div className="fixed top-8 left-8 text-gray-500 text-sm">
        Waiting for track...
      </div>
    );
  }

  return renderTheme({
    title: displayTrack.title,
    artist: displayTrack.artist,
    label: displayTrack.label,
    artwork: displayTrack.artworkUrl || displayTrack.artworkUrlSmall,
    isAnimating,
  });
}
