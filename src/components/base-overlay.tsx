import { EnrichedTrack } from "../types";
import { ReactNode, useEffect, useRef, useState } from "react";

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
  // Updating state midway through a timeline must not re-run the effect and
  // orphan the original timers. This ref is the timeline's source of truth.
  const displayTrackRef = useRef<EnrichedTrack | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pendingTimers = new Map<ReturnType<typeof setTimeout>, () => void>();
    const wait = (ms: number): Promise<boolean> =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          pendingTimers.delete(timer);
          resolve(!cancelled);
        }, ms);
        pendingTimers.set(timer, () => {
          clearTimeout(timer);
          resolve(false);
        });
      });

    // Handle initial track or track changes
    if (!track) {
      return; // No track to display
    }

    // If displayTrack is not set yet, initialize it without animation
    const currentDisplayTrack = displayTrackRef.current;
    if (!currentDisplayTrack) {
      displayTrackRef.current = track;
      setDisplayTrack(track);
      return;
    }

    // If same track, no change needed
    if (track.id === currentDisplayTrack.id) {
      return;
    }

    // Start the animation cycle for track changes
    const handleTrackChange = async () => {
      setIsAnimating(true);

      // Phase 1: Wait for outgoing animation
      // Theme plays exit animation while isAnimating is true
      if (!(await wait(animationTiming.exitDuration))) return;

      // Phase 2: Update the track data
      displayTrackRef.current = track;
      setDisplayTrack(track);

      // Brief pause to ensure DOM update
      if (!(await wait(50))) return;

      // Phase 3: Trigger incoming animation
      // isAnimating is still true, theme plays entry animation
      if (!(await wait(animationTiming.enterDuration))) return;

      // Animation complete
      setIsAnimating(false);
    };

    handleTrackChange();
    return () => {
      cancelled = true;
      for (const cancel of pendingTimers.values()) cancel();
      pendingTimers.clear();
    };
  }, [
    track,
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
