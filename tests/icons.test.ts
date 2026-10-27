import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const expected = new Map([
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-512.png", 512],
]);

test("ships valid PWA PNG icons", () => {

  for (const [filename, size] of expected) {
    const buffer = fs.readFileSync(path.join("public", "icons", filename));
    assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(buffer.readUInt32BE(16), size);
    assert.equal(buffer.readUInt32BE(20), size);
  }
});
