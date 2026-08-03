import assert from "node:assert/strict";
import test from "node:test";
import { createBackup, parseBackup, serializeBackup } from "../src/features/backup/backup.ts";
import type { UserPlant } from "../src/features/garden/types.ts";

const plant: UserPlant = {
  id: "plant-1",
  catalogId: "monstera",
  nickname: "Моя монстера",
  photo: "data:image/png;base64,example",
  wateringInterval: 7,
  wateringHistory: ["2026-07-20"],
  mistingHistory: ["2026-07-21"],
  fertilizingInterval: 30,
  fertilizingHistory: ["2026-07-01"],
  addedAt: "2026-06-01",
  location: "home",
  notes: [{ id: "note-1", createdAt: "2026-07-22", content: "Новый лист" }],
  reminders: [{ id: "reminder-1", title: "Пересадить", date: "2026-08-10", done: false }],
};

test("round-trips all garden data and portable settings in backup v2", () => {
  const original = createBackup([plant], {
    lastActiveTab: "garden",
  });
  const result = parseBackup(JSON.parse(serializeBackup(original)));

  assert.equal(result.error, undefined);
  assert.deepEqual(result.backup?.plants, [plant]);
  assert.equal(result.backup?.settings.lastActiveTab, "garden");
  assert.equal(result.backup?.plants[0].photo, plant.photo);
  assert.deepEqual(result.backup?.plants[0].notes, plant.notes);
  assert.deepEqual(result.backup?.plants[0].reminders, plant.reminders);
});

test("migrates a legacy v1 backup without losing plants", () => {
  const result = parseBackup({ version: 1, exportedAt: "2025-01-01T00:00:00.000Z", plants: [plant] });

  assert.equal(result.migratedFrom, 1);
  assert.equal(result.backup?.version, 2);
  assert.equal(result.backup?.plants[0].nickname, "Моя монстера");
  assert.equal(result.backup?.settings.lastActiveTab, "home");
});

test("rejects unsupported and damaged backup files", () => {
  assert.equal(parseBackup({ version: 99, plants: [] }).backup, null);
  assert.equal(parseBackup({ app: "plantcare", version: 2, plants: [{ nickname: "Без ID" }] }).backup, null);
  assert.equal(parseBackup("not-json-object").backup, null);
});
