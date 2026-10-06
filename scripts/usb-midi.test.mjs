import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
const result = await build({
  entryPoints: [
    new URL("../src/midi/usb-controller.ts", import.meta.url).pathname,
  ],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const midi = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const mapping = {
  name: "Test controller",
  vendorId: 1,
  productId: 1,
  deckCount: 2,
  controls: [
    { controlType: "channel_fader", deck: 1, channel: 1, cc: 7 },
    { controlType: "eq_low", deck: 1, channel: 1, cc: 8 },
    { controlType: "filter", deck: 1, channel: 1, cc: 9, invert: true },
    { controlType: "crossfader", channel: 2, cc: 10 },
    { controlType: "cue", deck: 1, channel: 1, note: 11, isButton: true },
    { controlType: "eq_high", deck: 1, channel: 1, cc: 12, isOutput: true },
  ],
};
test("USB CC and note bytes use NP3 channel numbering, normalization and inversion", () => {
  const controller = midi.createUsbController(mapping);
  assert.deepEqual(controller.snapshot().observedControls, []);
  assert.equal(
    controller.receive(new Uint8Array([0xb0, 7, 96]), "USB").state.deck1
      .channelFader,
    96 / 127,
  );
  assert.equal(
    controller.receive(new Uint8Array([0xb0, 8, 64]), "USB").state.deck1.eqLow,
    0,
  );
  const filter = controller.receive(new Uint8Array([0xb0, 9, 127]), "USB");
  assert.equal(filter.state.deck1.filter, -1);
  assert.equal(filter.state.deck1.filterMode, "lpf");
  assert.ok(filter.observedControls.includes("deck1.filterMode"));
  assert.equal(
    controller.receive(new Uint8Array([0xb1, 10, 0]), "USB").state.crossfader,
    -1,
  );
  assert.equal(
    controller.receive(new Uint8Array([0x90, 11, 127]), "USB").state.deck1
      .cueActive,
    true,
  );
  assert.equal(
    controller.receive(new Uint8Array([0x90, 11, 0]), "USB").state.deck1
      .cueActive,
    false,
  );
});
test("unmapped, output-only and malformed MIDI do not create observed controls; devices start fresh", () => {
  const controller = midi.createUsbController(mapping);
  for (const data of [
    [0xb1, 7, 127],
    [0xb0, 99, 127],
    [0xb0, 12, 127],
    [0xf8],
    [0xb0, 7],
    [0xb0, 7, 255],
  ])
    assert.equal(controller.receive(new Uint8Array(data), "USB"), null);
  assert.deepEqual(controller.snapshot().observedControls, []);
  controller.receive(new Uint8Array([0xb0, 7, 127]), "USB A");
  const replacement = midi.createUsbController(mapping);
  assert.deepEqual(replacement.snapshot().observedControls, []);
  assert.equal(replacement.snapshot().state.deck1.channelFader, 0);
});
test("USB auto-detection uses NP3 model and alias matching including longest model names", () => {
  const entries = [
    { hashId: "1", name: "DDJ SX" },
    { hashId: "2", name: "DDJ-SX2" },
    { hashId: "3", name: "Xone:96", usbPortNames: ["Partner 96"] },
  ];
  assert.equal(midi.matchUsbMapping("DDJ-SX2 MIDI", entries).hashId, "2");
  assert.equal(midi.matchUsbMapping("Partner 96 1 6", entries).hashId, "3");
  assert.equal(midi.matchUsbMapping("XONE 96 1 5", entries).hashId, "3");
  assert.equal(midi.matchUsbMapping("Unknown device", entries), undefined);
});

test("transport buttons, loop presses and repeated jog messages survive controller snapshots", () => {
  const controls = [
    "play_pause",
    "cue",
    "loop_active",
    "loop_in",
    "loop_out",
    "loop_half",
    "loop_double",
    "jog_touch",
  ].map((controlType, index) => ({
    controlType,
    deck: 1,
    channel: 1,
    note: 20 + index,
    isButton: true,
  }));
  controls.push({ controlType: "jog_turn", deck: 1, channel: 1, cc: 30 });
  const controller = midi.createUsbController({ ...mapping, controls });
  const send = (status, number, value) =>
    controller.receive(new Uint8Array([status, number, value]), "USB");
  // Toggle releases do not manufacture an initial observation.
  assert.deepEqual(send(0x80, 20, 64).observedControls, []);
  assert.equal(send(0x90, 20, 127).state.deck1.playing, true);
  assert.equal(send(0x90, 20, 127).state.deck1.playing, false);
  assert.equal(controller.snapshot().state.deck1.playPressCount, 2);
  assert.equal(send(0x90, 21, 127).state.deck1.cueActive, true);
  assert.equal(send(0x80, 21, 64).state.deck1.cueActive, false);
  assert.equal(controller.snapshot().state.deck1.cuePressCount, 1);
  assert.equal(send(0x90, 22, 127).state.deck1.loopActive, true);
  for (const [index, key] of ["In", "Out", "Half", "Double"].entries()) {
    assert.equal(
      send(0x90, 23 + index, 127).state.deck1[`loop${key}Pressed`],
      true,
    );
    assert.equal(
      send(0x80, 23 + index, 64).state.deck1[`loop${key}Pressed`],
      false,
    );
    send(0x90, 23 + index, 127);
    assert.equal(controller.snapshot().state.deck1[`loop${key}Count`], 2);
  }
  assert.equal(send(0x90, 27, 127).state.deck1.jogTouching, true);
  assert.equal(send(0x80, 27, 64).state.deck1.jogTouching, false);
  send(0xb0, 30, 65);
  const snapshot = send(0xb0, 30, 65);
  assert.equal(snapshot.state.deck1.jogValue, 65);
  assert.equal(snapshot.state.deck1.jogSequence, 2);
  assert.ok(snapshot.observedControls.includes("deck1.jogSequence"));
});
