import assert from "node:assert/strict";
import test from "node:test";
import { GARDEN_STORAGE_KEY, loadGarden, migrateStoredPlant, saveGarden } from "../src/features/garden/repository/storage.ts";
import type { UserPlant } from "../src/features/garden/types.ts";

function memoryStorage(initial?: string): Storage {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(GARDEN_STORAGE_KEY, initial);
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

const plant: UserPlant = {
  id: "plant-1", catalogId: "monstera", nickname: "Монстера", photo: null,
  wateringInterval: 7, wateringHistory: [], mistingHistory: [],
  fertilizingInterval: 30, fertilizingHistory: [], addedAt: "2026-08-01",
  location: "home", notes: [], reminders: [],
};

test("saves and loads the garden through an injected storage", () => {
  const storage = memoryStorage();
  assert.deepEqual(saveGarden([plant], storage), { ok: true });
  assert.deepEqual(loadGarden(storage), { plants: [plant] });
});

test("migrates missing legacy fields without losing the plant", () => {
  const migrated = migrateStoredPlant({ id: "legacy", nickname: "Старое растение", wateringInterval: 9 });
  assert.equal(migrated?.location, "home");
  assert.equal(migrated?.fertilizingInterval, 30);
  assert.deepEqual(migrated?.wateringHistory, []);
  assert.deepEqual(migrated?.notes, []);
  assert.deepEqual(migrated?.reminders, []);
});

test("reports corrupted and unavailable storage without throwing", () => {
  assert.deepEqual(loadGarden(memoryStorage("not-json")), { plants: [], error: "invalid-data" });
  assert.deepEqual(loadGarden(null), { plants: [], error: "unavailable" });
  assert.deepEqual(saveGarden([plant], null), { ok: false, error: "unavailable" });
});

test("reports a write failure instead of throwing", () => {
  const storage = memoryStorage();
  storage.setItem = () => { throw new Error("quota"); };
  assert.deepEqual(saveGarden([plant], storage), { ok: false, error: "quota-exceeded" });
});

test("keeps valid records when one stored record is damaged", () => {
  const storage = memoryStorage(JSON.stringify([plant, { nickname: "Без id" }]));
  assert.deepEqual(loadGarden(storage), { plants: [plant], error: "invalid-data" });
});
