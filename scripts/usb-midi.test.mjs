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
