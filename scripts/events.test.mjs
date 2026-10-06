import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
async function load(path) {
  const result = await build({
    entryPoints: [root + path],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
  );
}
const events = await load("src/events.ts");
const simulation = await load("src/components/simulated-events.ts");
test("iframe, simulation and recorded events share one receiver and subscriptions", () => {
  const snapshot = simulation.moveSimulatedControl(
    simulation.simulatedController(),
    "deck1.channelFader",
    0.75,
  );
  const frame = { type: "np:controller", protocol: 1, controller: snapshot };
  const live = events.reduceThemeMessage(events.EMPTY_EVENTS, frame);
  const recording = events.parseRecording({
    version: 1,
    frames: [{ at: 0, message: frame }],
  });
  const replay = events.reduceThemeMessage(
    events.EMPTY_EVENTS,
    recording[0].message,
  );
  assert.deepEqual(replay, live);
  assert.equal(
    events.controllerValue(live.controller, "deck1.channelFader"),
    0.75,
  );
  assert.equal(events.subscribedProps(live).controller, null);
  assert.equal(
    events.subscribedProps(live, ["controller"]).controller,
    snapshot,
  );
  const cleared = events.reduceThemeMessage(live, {
    type: "np:controller",
    protocol: 1,
    controller: null,
  });
  assert.equal(
    events.controllerValue(cleared.controller, "deck1.channelFader"),
    undefined,
  );
});
test("unobserved defaults and disconnected controls stay unknown", () => {
  const snapshot = simulation.simulatedController();
  snapshot.observedControls = [];
  assert.equal(events.controllerValue(snapshot, "deck1.eqLow"), undefined);
  snapshot.observedControls = ["deck1.eqLow"];
  assert.equal(events.controllerValue(snapshot, "deck1.eqLow"), 0);
  snapshot.connected = false;
  assert.equal(events.controllerValue(snapshot, "deck1.eqLow"), undefined);
});
test("existing mix messages and explicit null resets are accepted", () => {
  const mix = simulation.simulatedMix(simulation.simulatedController());
  const state = events.reduceThemeMessage(events.EMPTY_EVENTS, {
    type: "np:mix",
    protocol: 1,
    state: mix,
  });
  assert.equal(events.subscribedProps(state).mixState, mix);
  assert.equal(events.subscribedProps(state, ["track"]).mixState, null);
  assert.equal(
    events.reduceThemeMessage(state, {
      type: "np:mix",
      protocol: 1,
      state: null,
    }).mixState,
    null,
  );
});
test("invalid versions, malformed controller state and broken replay timing are rejected", () => {
  assert.equal(
    events.decodeThemeMessage({
      type: "np:controller",
      protocol: 2,
      controller: null,
    }),
    null,
  );
  assert.equal(
    events.decodeThemeMessage({
      type: "np:controller",
      protocol: 1,
      controller: { connected: true, state: {} },
    }),
    null,
  );
  const message = { type: "np:controller", protocol: 1, controller: null };
  assert.throws(() =>
    events.parseRecording({
      version: 1,
      frames: [
        { at: 2, message },
        { at: 1, message },
      ],
    }),
  );
  assert.throws(() =>
    events.parseRecording({ version: 1, frames: [{ at: -1, message }] }),
  );
  assert.throws(() =>
    events.parseRecording({ version: 1, frames: [{ at: Infinity, message }] }),
  );
});
