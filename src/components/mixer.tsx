// Adapted from Now Playing 3 apps/web/src/components/dj/Mixer.tsx.
// Keep the same knob rotation, channel strip layout and fader rendering.
import { controllerValue, type ThemeControllerSnapshot } from "../events";
interface DJChannelStrip {
  channel: number;
  eqHigh?: number;
  eqMid?: number;
  eqLow?: number;
  filter?: number;
  fader?: number;
}
const labels: Record<string, string> = {
  "dj.mixer.notConnected": "Controller disconnected",
  "dj.mixer.eqHigh": "High",
  "dj.mixer.eqMid": "Mid",
  "dj.mixer.eqLow": "Low",
  "dj.mixer.filter": "Filter",
};
const t = (key: string) => labels[key] ?? key;

export function ControllerMixer({
  snapshot,
  onChange,
}: {
  snapshot: ThemeControllerSnapshot | null;
  onChange?: (path: string, value: number) => void;
}) {
  const decks = [
    ...new Set(
      snapshot?.availableControls.flatMap((path) => {
        const match = /^deck([1-6])\./.exec(path);
        return match ? [Number(match[1])] : [];
      }) ?? [],
    ),
  ].sort((a, b) => a - b);
  const value = (path: string) => {
    const result = controllerValue(snapshot, path);
    return typeof result === "number" ? result : undefined;
  };
  const channels = (decks.length ? decks : [1, 2, 3, 4]).map((channel) => ({
    channel,
    eqHigh: value(`deck${channel}.eqHigh`),
    eqMid: value(`deck${channel}.eqMid`),
    eqLow: value(`deck${channel}.eqLow`),
    filter: value(`deck${channel}.filter`),
    fader: value(`deck${channel}.channelFader`),
  }));
  return (
    <Mixer
      model={
        snapshot?.connected
          ? (snapshot.state?.controllerName ?? "Controller")
          : "none"
      }
      channels={channels}
      showChannelNumbers
      onChange={onChange}
      crossfader={value("crossfader")}
    />
  );
}

interface MixerProps {
  deviceId?: string;
  onChange?: (path: string, value: number) => void;
  crossfader?: number;
  model: string;
  channels?: DJChannelStrip[];
  /** Whether to show EQ controls (default: true) */
  showEq?: boolean;
  /** Whether to show filter control (default: true) */
  showFilter?: boolean;
  /** Whether to label each strip with its channel number (default: false) */
  showChannelNumbers?: boolean;
  /** Channel currently on air, tinted so it reads at a glance. */
  onAirChannel?: number | null;
}

export default function Mixer({
  deviceId,
  onChange,
  crossfader,
  model,
  channels,
  showEq = true,
  showFilter = true,
  showChannelNumbers = false,
  onAirChannel = null,
}: MixerProps) {
  // Default channels if not provided (using schema value ranges)
  const channelData =
    channels ||
    ([
      { channel: 1, eqHigh: 0, eqMid: 0, eqLow: 0, filter: 0, fader: 0 },
      { channel: 2, eqHigh: 0, eqMid: 0, eqLow: 0, filter: 0, fader: 0 },
    ] as DJChannelStrip[]);

  return (
    <div
      className={`w-full shrink-0 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col`}
    >
      {/* Channel Strips */}
      <div className="flex-1 flex">
        {channelData.map((ch) => (
          <ChannelStrip
            key={ch.channel}
            {...ch}
            onChange={onChange}
            showEq={showEq}
            showFilter={showFilter}
            showChannelNumbers={showChannelNumbers}
            isOnAir={ch.channel === onAirChannel}
          />
        ))}
      </div>

      <label className="px-4 pb-3 flex flex-col gap-1 text-[10px] text-zinc-400">
        <span>
          Crossfader ·{" "}
          {crossfader === undefined ? "Unknown" : crossfader.toFixed(2)}
        </span>
        <input
          aria-label="Crossfader"
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={crossfader ?? 0}
          disabled={!onChange || crossfader === undefined}
          onChange={(event) =>
            onChange?.("crossfader", Number(event.target.value))
          }
          className="w-full accent-orange-500 disabled:opacity-30"
        />
      </label>
      {/* Model Label */}
      <div className="border-t border-zinc-800 p-2">
        <div className="flex justify-center items-center gap-1">
          {model === "—" || model === "none" ? (
            <>
              <span className="text-xs text-yellow-500 font-bold">
                {t("dj.mixer.notConnected")}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-400 font-bold">{model}</span>
              {deviceId && (
                <span className="text-[10px] text-zinc-400/50">{deviceId}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChannelStripProps extends DJChannelStrip {
  showEq?: boolean;
  showFilter?: boolean;
  showChannelNumbers?: boolean;
  isOnAir?: boolean;
  onChange?: (path: string, value: number) => void;
}

function ChannelStrip({
  channel,
  onChange,
  eqHigh,
  eqMid,
  eqLow,
  filter,
  fader,
  showEq = true,
  showFilter = true,
  showChannelNumbers = false,
  isOnAir = false,
}: ChannelStripProps) {
  // Convert fader 0-1 to percentage (0% = off, 100% = full)
  const faderPercent = (fader ?? 0) * 100;

  return (
    <div
      className={`flex-1 border-r border-zinc-800 last:border-r-0 p-2 flex flex-col items-center gap-2 ${
        isOnAir ? "bg-gradient-to-b from-red-500/10 to-transparent" : ""
      }`}
    >
      {showChannelNumbers && (
        <span
          className={`text-[10px] font-medium ${
            isOnAir ? "text-red-500" : "text-zinc-400"
          }`}
        >
          {channel}
        </span>
      )}

      {/* EQ Section */}
      <div className="flex flex-col items-center gap-3">
        {showEq && (
          <>
            <div className="flex flex-col items-center gap-1">
              <Knob
                size={32}
                value={eqHigh}
                label={`Deck ${channel} High EQ`}
                onChange={
                  onChange
                    ? (value) => onChange(`deck${channel}.eqHigh`, value)
                    : undefined
                }
              />
              <span className="text-[10px] text-zinc-400">
                {t("dj.mixer.eqHigh")}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Knob
                size={32}
                value={eqMid}
                label={`Deck ${channel} Mid EQ`}
                onChange={
                  onChange
                    ? (value) => onChange(`deck${channel}.eqMid`, value)
                    : undefined
                }
              />
              <span className="text-[10px] text-zinc-400">
                {t("dj.mixer.eqMid")}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Knob
                size={32}
                value={eqLow}
                label={`Deck ${channel} Low EQ`}
                onChange={
                  onChange
                    ? (value) => onChange(`deck${channel}.eqLow`, value)
                    : undefined
                }
              />
              <span className="text-[10px] text-zinc-400">
                {t("dj.mixer.eqLow")}
              </span>
            </div>
          </>
        )}
        {showFilter && (
          <div className="flex flex-col items-center gap-1">
            <Knob
              size={32}
              value={filter}
              label={`Deck ${channel} Filter`}
              onChange={
                onChange
                  ? (value) => onChange(`deck${channel}.filter`, value)
                  : undefined
              }
              variant="silver"
            />
            <span className="text-[10px] text-zinc-400">
              {t("dj.mixer.filter")}
            </span>
          </div>
        )}
      </div>

      <span className="text-[10px] text-zinc-400">
        {fader === undefined ? "Unknown" : fader.toFixed(2)}
      </span>
      {/* Channel Fader */}
      <div
        className="relative w-2 h-24 bg-zinc-800 rounded-full mt-2 mb-2"
        style={{ opacity: fader === undefined ? 0.3 : 1 }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#ff6b00] to-[#ff6b00]/50 rounded-full transition-[height] duration-75 ease-out"
          style={{ height: `${faderPercent}%` }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-7 h-3 bg-zinc-500 rounded border border-zinc-600 transition-[bottom] duration-75 ease-out"
          style={{ bottom: `calc(${faderPercent}% - 6px)` }}
        />
        <input
          aria-label={`Deck ${channel} Fader`}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={fader ?? 0}
          disabled={!onChange || fader === undefined}
          onChange={(event) =>
            onChange?.(
              `deck${channel}.channelFader`,
              Number(event.target.value),
            )
          }
          className="absolute -left-3 top-0 w-8 h-full opacity-0 cursor-pointer focus:opacity-50"
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
        />
      </div>
    </div>
  );
}

interface KnobProps {
  label: string;
  onChange?: (value: number) => void;
  size?: number;
  value?: number; // -1 to 1 (-1=cut/left, 0=center, 1=boost/right)
  variant?: "default" | "silver";
}

function Knob({
  size = 24,
  value,
  variant = "default",
  label,
  onChange,
}: KnobProps) {
  // Convert -1 to 1 to rotation angle
  // -1 = -135deg (7 o'clock), 0 = 0deg (12 o'clock), 1 = 135deg (5 o'clock)
  const rotation = (value ?? 0) * 135;

  const knobStyles = {
    default: "bg-zinc-700 border-zinc-600",
    silver: "bg-gradient-to-b from-[#c0c0c0] to-[#808080] border-[#d0d0d0]",
  };

  return (
    <div
      className={`rounded-full border relative ${knobStyles[variant]}`}
      style={{
        width: size,
        height: size,
        opacity: value === undefined ? 0.3 : 1,
      }}
      title={`${label}: ${value === undefined ? "Unknown" : value.toFixed(2)}`}
    >
      <div
        className="absolute top-1/2 left-1/2 w-0.5 bg-white rounded-full transition-transform duration-75 ease-out"
        style={{
          height: size * 0.35,
          transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
          transformOrigin: "bottom center",
        }}
      />
      <input
        aria-label={label}
        type="range"
        min={-1}
        max={1}
        step={0.01}
        value={value ?? 0}
        disabled={!onChange || value === undefined}
        onChange={(event) => onChange?.(Number(event.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:opacity-50"
        style={{ writingMode: "vertical-lr", direction: "rtl" }}
      />
    </div>
  );
}
