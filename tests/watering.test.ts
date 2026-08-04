import assert from "node:assert/strict";
import test from "node:test";
import { daysSince, getWateringStatus, replaceLastWateringDate } from "../src/features/garden/model/watering.ts";
import type { UserPlant } from "../src/features/garden/types.ts";

const NOW = Date.parse("2026-08-10T00:00:00.000Z");
const plant: UserPlant = {
  id: "plant-1", catalogId: "monstera", nickname: "Монстера", photo: null,
  wateringInterval: 7, wateringHistory: [], mistingHistory: [],
  fertilizingInterval: 30, fertilizingHistory: [], addedAt: "2026-08-01",
  location: "home", notes: [], reminders: [],
};

test("calculates whole days from an explicit clock", () => {
  assert.equal(daysSince("2026-08-07T00:00:00.000Z", NOW), 3);
});

test("marks a plant without history as needing its first watering", () => {
  assert.deepEqual(getWateringStatus(plant, NOW), {
    label: "Полейте сегодня", color: "gray", daysUntil: 0, urgency: 0.5,
  });
});

test("returns green, tomorrow, due, and overdue statuses", () => {
  const withLastWatering = (date: string) => ({ ...plant, wateringHistory: [date] });
  assert.equal(getWateringStatus(withLastWatering("2026-08-07"), NOW).color, "green");
  assert.deepEqual(getWateringStatus(withLastWatering("2026-08-04"), NOW), {
    label: "Полейте завтра", color: "yellow", daysUntil: 1, urgency: 0.7,
  });
  assert.deepEqual(getWateringStatus(withLastWatering("2026-08-03"), NOW), {
    label: "Полейте сегодня", color: "red", daysUntil: 0, urgency: 1,
  });
  assert.deepEqual(getWateringStatus(withLastWatering("2026-08-01"), NOW), {
    label: "Просрочено 2 дн.", color: "red", daysUntil: -2, urgency: 1,
  });
});

test("edits only the latest watering record", () => {
  assert.deepEqual(
    replaceLastWateringDate(["2026-07-01", "2026-08-01"], "2026-08-03"),
    ["2026-07-01", "2026-08-03"],
  );
  assert.deepEqual(replaceLastWateringDate([], "2026-08-03"), ["2026-08-03"]);
});

test("removes only the latest watering record", () => {
  assert.deepEqual(
    replaceLastWateringDate(["2026-07-01", "2026-08-01"], null),
    ["2026-07-01"],
  );
});
