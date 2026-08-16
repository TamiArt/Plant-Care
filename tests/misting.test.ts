import assert from "node:assert/strict";
import test from "node:test";
import { isMistedToday } from "../src/features/garden/model/misting.ts";

const NOW = Date.parse("2026-08-16T12:00:00.000Z");

test("reports a plant as misted when today is in its history", () => {
  assert.equal(isMistedToday(["2026-08-10", "2026-08-16"], NOW), true);
});

test("reports a plant as not misted when history is empty or older", () => {
  assert.equal(isMistedToday([], NOW), false);
  assert.equal(isMistedToday(["2026-08-15"], NOW), false);
});

test("recognizes today even when imported history is not ordered", () => {
  assert.equal(isMistedToday(["2026-08-16", "2026-08-10"], NOW), true);
});
