import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("watering triggers cloud sync only after the local watering save succeeds", () => {
  const source = readFileSync("src/app/App.tsx", "utf8");
  const start = source.indexOf("const handleWater = useCallback(");
  const end = source.indexOf("const sharedScreenProps", start);
  assert.notEqual(start, -1, "handleWater callback should exist");
  assert.notEqual(end, -1, "handleWater callback should end before shared screen props");

  const handler = source.slice(start, end);
  assert.match(handler, /await garden\.waterPlant\(plantId\)/);
  assert.match(handler, /if \(result\.ok && auth\.isAuthenticated\)/);
  assert.match(handler, /void syncNow\(\)/);
  assert.ok(
    handler.indexOf("await garden.waterPlant(plantId)") < handler.indexOf("void syncNow()"),
    "cloud sync must start after local watering succeeds",
  );
});

test("watering from the plant list and detail sheet uses the same immediate-sync handler", () => {
  const source = readFileSync("src/app/App.tsx", "utf8");
  assert.match(source, /onWater:\s*\(plant: UserPlant\) =>\s*handleWater\(plant\.id\)/);
  assert.match(source, /onWater=\{\(\) =>\s*handleWater\(liveDetail\.id\)\}/);
});
