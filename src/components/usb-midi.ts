import { useCallback, useEffect, useRef, useState } from "react";
import type { ThemeControllerSnapshot } from "../events";
import type { ControllerMapping } from "../midi/controller-state";
import {
  createUsbController,
  matchUsbMapping,
  type MappingEntry,
} from "../midi/usb-controller";

export function useUsbMidi(
  enabled: boolean,
  receive: (snapshot: ThemeControllerSnapshot | null) => void,
) {
  const [access, setAccess] = useState<MIDIAccess | null>(null);
  const accessRef = useRef<MIDIAccess | null>(null);
  const [devices, setDevices] = useState<MIDIInput[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [mappingId, setMappingId] = useState("");
  const [mappings, setMappings] = useState<MappingEntry[]>([]);
  const [status, setStatus] = useState(
    "Connect USB MIDI to choose your controller.",
  );
  const topology = useRef("");
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);
  const requesting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback((next: MIDIAccess) => {
    const devices = [...next.inputs.values()].filter(
      (input) => input.state === "connected",
    );
    setDevices(devices);
    const signature = devices
      .map((device) => device.id)
      .sort()
      .join("\n");
    if (signature !== topology.current) {
      topology.current = signature;
      setRevision((value) => value + 1);
    }
  }, []);
  const connect = async () => {
    if (requesting.current) return;
    if (!navigator.requestMIDIAccess) {
      setStatus(
        "USB MIDI is unavailable in this browser. Open the SDK in Chrome or Edge.",
      );
      return;
    }
    requesting.current = true;
    setStatus(
      "Requesting MIDI access… If no permission prompt appears, open the SDK in Chrome or Edge.",
    );
    try {
      const next =
        accessRef.current ??
        (await navigator.requestMIDIAccess({ sysex: false }));
      if (!mounted.current) return;
      accessRef.current = next;
      setAccess(next);
      refresh(next);
      setStatus(
        [...next.inputs.values()].some((input) => input.state === "connected")
          ? "Select a USB MIDI device."
          : "No MIDI inputs found. Connect your USB controller.",
      );
    } catch (error) {
      if (mounted.current)
        setStatus(
          error instanceof Error ? error.message : "MIDI access was denied.",
        );
    } finally {
      requesting.current = false;
    }
  };
  useEffect(() => {
    if (!access) return;
    const update = () => refresh(access);
    access.addEventListener("statechange", update);
    return () => access.removeEventListener("statechange", update);
  }, [access, refresh]);
  useEffect(() => {
    if (!enabled || !access) return;
    const abort = new AbortController();
    void fetch("/__np3/mappings", { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Controller catalog unavailable. Try connecting again.",
          );
        const data = (await response.json()) as { mappings: MappingEntry[] };
        if (!abort.signal.aborted) setMappings(data.mappings);
      })
      .catch((error) => {
        if (!abort.signal.aborted) setStatus(error.message);
      });
    return () => abort.abort();
  }, [enabled, access, revision]);
  useEffect(() => {
    if (!enabled) return;
    receive(null);
    const input = access?.inputs.get(deviceId);
    if (!input || input.state !== "connected") {
      if (deviceId)
        setStatus(
          "Selected device disconnected. Reconnect it or select another device.",
        );
      return;
    }
    if (!mappings.length) return;
    const match = mappingId
      ? mappings.find((entry) => entry.hashId === mappingId)
      : matchUsbMapping(input.name ?? "", mappings);
    if (!match) {
      setStatus(
        "No automatic mapping found. Choose the controller mapping below.",
      );
      return;
    }
    const abort = new AbortController();
    let cleanup = () => {};
    setStatus(`Loading ${match.name}…`);
    void fetch(`/__np3/mappings/${encodeURIComponent(match.hashId)}`, {
      signal: abort.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Controller mapping unavailable.");
        const mapping = (await response.json()) as ControllerMapping;
        if (abort.signal.aborted) return;
        const controller = createUsbController(mapping);
        const onMessage = (event: MIDIMessageEvent) => {
          if (!event.data) return;
          const snapshot = controller.receive(
            event.data,
            input.name ?? "USB MIDI",
          );
          if (snapshot) receive(snapshot);
        };
        input.addEventListener("midimessage", onMessage);
        cleanup = () => input.removeEventListener("midimessage", onMessage);
        receive(controller.snapshot());
        setStatus(
          `${input.name} · ${match.name}. Move a control to see its position.`,
        );
      })
      .catch((error) => {
        if (!abort.signal.aborted) {
          receive(null);
          setStatus(error.message);
        }
      });
    return () => {
      abort.abort();
      cleanup();
      receive(null);
    };
  }, [enabled, access, deviceId, mappingId, mappings, revision, receive]);
  return {
    devices,
    deviceId,
    mappings,
    mappingId,
    status,
    connect,
    selectDevice: (id: string) => {
      setDeviceId(id);
      setMappingId("");
    },
    setMappingId,
  };
}
