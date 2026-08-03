import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const expected = new Map([
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-512.png", 512],
]);

test("generates valid PWA PNG icons from the text-only build script", () => {
  const result = spawnSync(process.execPath, ["scripts/generate-icons.mjs"], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);

  for (const [filename, size] of expected) {
    const buffer = fs.readFileSync(path.join("public", "icons", filename));
    assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(buffer.readUInt32BE(16), size);
    assert.equal(buffer.readUInt32BE(20), size);
  }
});
