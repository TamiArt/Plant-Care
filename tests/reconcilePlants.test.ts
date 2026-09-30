import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeSyncedPlant,
} from "../src/features/garden/model/careSyncMerge.ts";

import type {
  UserPlant,
} from "../src/features/garden/types.ts";

function plant(
  overrides: Partial<UserPlant> = {},
): UserPlant {
  return {
    id: "plant-1",
    catalogId: "monstera",
    nickname: "Монстера",
    photoId: null,
    photoIds: [],
    wateringInterval: 7,
    wateringHistory: [],
    mistingHistory: [],
    fertilizingInterval: 30,
    fertilizingHistory: [],
    addedAt: "2026-08-01",
    location: "home",
    notes: [],
    reminders: [],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

test("keeps watering added locally while sync response is in flight", () => {
  const local = plant({
    wateringHistory: ["2026-08-17"],
    updatedAt: "2026-08-17T10:00:02.000Z",
  });
  const staleRemote = plant({
    wateringHistory: [],
    updatedAt: "2026-08-17T10:00:01.000Z",
  });

  const result = mergeSyncedPlant(local, staleRemote);

  assert.deepEqual(result.wateringHistory, ["2026-08-17"]);
});

test("keeps watering even when remote timestamp is ahead", () => {
  const local = plant({
    wateringHistory: ["2026-08-17"],
    updatedAt: "2026-08-17T10:00:02.000Z",
  });
  const remote = plant({
    wateringHistory: [],
    updatedAt: "2026-08-18T10:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.deepEqual(result.wateringHistory, ["2026-08-17"]);
  assert.ok(result.updatedAt > remote.updatedAt);
});

test("accepts newer remote metadata", () => {
  const local = plant({ nickname: "Локальное имя" });
  const remote = plant({
    nickname: "С другого устройства",
    updatedAt: "2026-08-17T11:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.equal(result.nickname, "С другого устройства");
});

test("merges care events from both devices without duplicates", () => {
  const local = plant({
    wateringHistory: ["2026-08-01", "2026-08-17"],
  });
  const remote = plant({
    wateringHistory: ["2026-08-01", "2026-08-10"],
    mistingHistory: ["2026-08-12"],
    updatedAt: "2026-08-17T11:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.deepEqual(result.wateringHistory, [
    "2026-08-01",
    "2026-08-10",
    "2026-08-17",
  ]);
  assert.deepEqual(result.mistingHistory, ["2026-08-12"]);
});

test("preserves three locally added photos when the remote snapshot is older", () => {
  const local = plant({
    photoId: "photo-3",
    photoIds: ["photo-1", "photo-2", "photo-3"],
    updatedAt: "2026-08-17T10:00:02.000Z",
  });
  const remote = plant({
    photoId: "old-photo",
    photoIds: ["old-photo"],
    updatedAt: "2026-08-17T10:00:01.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.deepEqual(result.photoIds, [
    "photo-1",
    "photo-2",
    "photo-3",
  ]);
  assert.equal(result.photoId, "photo-3");
});

test("preserves local photos even when a newer remote plant update has no gallery changes", () => {
  const local = plant({
    photoId: "photo-3",
    photoIds: ["photo-1", "photo-2", "photo-3"],
    updatedAt: "2026-08-17T10:00:02.000Z",
  });
  const remote = plant({
    photoId: null,
    photoIds: [],
    nickname: "Изменено на другом устройстве",
    updatedAt: "2026-08-18T10:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.equal(result.nickname, "Изменено на другом устройстве");
  assert.deepEqual(result.photoIds, [
    "photo-1",
    "photo-2",
    "photo-3",
  ]);
  assert.equal(result.photoId, "photo-3");
});

test("keeps a legacy single photo when the remote snapshot has no gallery metadata", () => {
  const local = plant({
    photoId: "legacy-photo",
    photoIds: ["legacy-photo"],
  });
  const remote = plant({
    photoId: null,
    photoIds: [],
    updatedAt: "2026-08-18T10:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.deepEqual(result.photoIds, ["legacy-photo"]);
  assert.equal(result.photoId, "legacy-photo");
});


test("merges all photos from local and remote without truncating the gallery", () => {
  const local = plant({
    photoId: "local-primary",
    photoIds: ["old-1", "local-primary", "local-3", "local-4"],
  });
  const remote = plant({
    photoId: "remote-primary",
    photoIds: ["old-1", "remote-2", "remote-primary"],
    updatedAt: "2026-08-18T10:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.deepEqual(result.photoIds, [
    "old-1",
    "local-primary",
    "local-3",
    "local-4",
    "remote-2",
    "remote-primary",
  ]);
  assert.equal(result.photoId, "local-primary");
});

test("preserves a primary photo selected locally during sync", () => {
  const local = plant({
    photoId: "photo-2",
    photoIds: ["photo-1", "photo-2", "photo-3"],
    updatedAt: "2026-08-17T10:00:02.000Z",
  });
  const remote = plant({
    photoId: "photo-1",
    photoIds: ["photo-1", "photo-2", "photo-3"],
    updatedAt: "2026-08-18T10:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.deepEqual(result.photoIds, [
    "photo-1",
    "photo-2",
    "photo-3",
  ]);
  assert.equal(result.photoId, "photo-2");
});

test("does not resurrect a photo deleted locally when the remote still has it", () => {
  const local = plant({
    photoId: "photo-2",
    photoIds: ["photo-2", "photo-3"],
    deletedPhotoIds: ["photo-1"],
  });
  const remote = plant({
    photoId: "photo-1",
    photoIds: ["photo-1", "photo-2", "photo-3"],
  });

  const result = mergeSyncedPlant(local, remote);

  assert.deepEqual(result.photoIds, [
    "photo-2",
    "photo-3",
  ]);
  assert.deepEqual(result.deletedPhotoIds, [
    "photo-1",
  ]);
});
