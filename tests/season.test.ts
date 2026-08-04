import assert from "node:assert/strict";
import test from "node:test";
import { getSeasonLabel, getSeasonTips, isWinterMonth, SEASON_TIPS } from "../src/features/care/model/season.ts";

test("maps all calendar months to the existing season labels", () => {
  assert.equal(getSeasonLabel(1), "Зима ❄️");
  assert.equal(getSeasonLabel(3), "Весна 🌸");
  assert.equal(getSeasonLabel(6), "Лето ☀️");
  assert.equal(getSeasonLabel(9), "Осень 🍂");
  assert.equal(getSeasonLabel(12), "Зима ❄️");
});

test("preserves the extended winter care period", () => {
  assert.equal(isWinterMonth(1), true);
  assert.equal(isWinterMonth(3), true);
  assert.equal(isWinterMonth(4), false);
  assert.equal(isWinterMonth(11), true);
});

test("returns only tips assigned to the selected month", () => {
  const julyTips = getSeasonTips(7);
  assert.ok(julyTips.length > 0);
  assert.ok(julyTips.every(tip => tip.months.includes(7)));
  assert.ok(julyTips.some(tip => tip.category === "Вредители"));
});

test("keeps unique identifiers for editorial season tips", () => {
  assert.equal(new Set(SEASON_TIPS.map(tip => tip.id)).size, SEASON_TIPS.length);
});
