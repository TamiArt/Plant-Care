import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("cross-device sync refreshes periodically while the app is visible", () => {
  const source = readFileSync(
    "src/features/garden/hooks/useGardenAutoSync.ts",
    "utf8",
  );

  assert.match(source, /window\.setInterval/);
  assert.match(source, /15_000/);
  assert.match(source, /document\.visibilityState === "visible"/);
  assert.match(source, /navigator\.onLine/);
});

test("cross-device sync refreshes on foreground and network restoration", () => {
  const source = readFileSync(
    "src/features/garden/hooks/useGardenAutoSync.ts",
    "utf8",
  );

  assert.match(source, /window\.addEventListener\("focus", syncWhenVisible\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange", syncWhenVisible\)/);
  assert.match(source, /window\.addEventListener\("online", syncWhenOnline\)/);
  assert.match(source, /window\.removeEventListener\("focus", syncWhenVisible\)/);
  assert.match(source, /document\.removeEventListener\("visibilitychange", syncWhenVisible\)/);
  assert.match(source, /window\.removeEventListener\("online", syncWhenOnline\)/);
});

test("sync requests are serialized and overlapping triggers queue another pass", () => {
  const source = readFileSync(
    "src/features/garden/hooks/useGardenAutoSync.ts",
    "utf8",
  );

  assert.match(source, /if \(runningRef\.current\)/);
  assert.match(source, /pendingRef\.current = true/);
  assert.match(source, /while \(pendingRef\.current && canSync\)/);
});
