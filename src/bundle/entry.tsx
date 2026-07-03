import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { EnrichedTrack } from "../types";
import { BUNDLED_THEMES, BundledThemeProps } from "./themes";
import "../index.css";

/**
 * Bundle entry that bridges the postMessage protocol used by the Now Playing
 * iframe overlay to whichever theme component the host HTML has selected via
 * `<meta name="np-theme" content="...">`.
 *
 * Protocol:
 *   { type: "np:hello",  protocol: 1 }
 *   { type: "np:track",  protocol: 1, track, connected }
 *   { type: "np:mix",    protocol: 1, state }
 */

const PROTOCOL_VERSION = 1;

function readThemeId(): string {
  const meta = document.head.querySelector<HTMLMetaElement>(
    'meta[name="np-theme"]',
  );
  const id = meta?.content?.trim();
  if (!id) {
    throw new Error(
      'Missing <meta name="np-theme" content="..."> in bundle HTML',
    );
  }
  return id;
}

interface TrackMessage {
  type: "np:track";
  protocol: number;
  track: EnrichedTrack | null;
  connected?: boolean;
}

interface HelloMessage {
  type: "np:hello";
  protocol: number;
}

type NPMessage = TrackMessage | HelloMessage | { type: string };

function App({ themeId }: { themeId: string }) {
  const Component = BUNDLED_THEMES[themeId];
  if (!Component) {
    return (
      <div
        style={{
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          padding: 16,
        }}
      >
        Theme "{themeId}" is not registered in this bundle.
      </div>
    );
  }

  const [track, setTrack] = useState<EnrichedTrack | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent<NPMessage>) {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "np:track" && (msg as TrackMessage).protocol === PROTOCOL_VERSION) {
        setTrack((msg as TrackMessage).track ?? null);
      }
    }
    window.addEventListener("message", onMessage);
    // Announce readiness so the host can re-send any state it has buffered.
    window.parent?.postMessage(
      { type: "np:ready", protocol: PROTOCOL_VERSION },
      "*",
    );
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const props: BundledThemeProps = { track };
  return <Component {...props} />;
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Bundle entry expected #root element in the host HTML");
}

const themeId = readThemeId();
createRoot(root).render(
  <StrictMode>
    <App themeId={themeId} />
  </StrictMode>,
);
