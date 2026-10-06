import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { EMPTY_EVENTS, reduceThemeMessage, subscribedProps } from "../events";
import { USER_THEMES } from "../registry";
import "../index.css";

function App({ themeId }: { themeId: string }) {
  const selected = USER_THEMES.find((theme) => theme.meta.id === themeId);
  const Component = selected?.Component;
  const events = selected?.meta.events;
  const [state, setState] = useState(EMPTY_EVENTS);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      setState((current) => reduceThemeMessage(current, event.data));
    };
    window.addEventListener("message", onMessage);
    // Replay after each effect setup: StrictMode may detach the first listener.
    window.parent.postMessage({ type: "np:ready", protocol: 1 }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);
  if (!Component)
    return <p>Theme "{themeId}" is not present in this bundle.</p>;
  return <Component {...subscribedProps(state, events)} />;
}
const themeId = document.head.querySelector<HTMLMetaElement>(
  'meta[name="np-theme"]',
)?.content;
const root = document.getElementById("root");
if (!themeId || !root)
  throw new Error("Bundle HTML must declare np-theme and #root");
createRoot(root).render(
  <StrictMode>
    <App themeId={themeId} />
  </StrictMode>,
);
