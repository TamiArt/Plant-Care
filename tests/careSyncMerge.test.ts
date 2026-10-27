import assert from "node:assert/strict";
import test from "node:test";

import { mergeSyncedPlant } from "../src/features/garden/model/careSyncMerge.ts";
import type { UserPlant } from "../src/features/garden/types.ts";

function plant(overrides: Partial<UserPlant> = {}): UserPlant {
  return {
    id: "plant-1",
    catalogId: null,
    nickname: "Монстера",
    photoId: null,
    photoIds: [],
    deletedPhotoIds: [],
    wateringInterval: 7,
    wateringHistory: ["2026-08-01"],
    mistingEnabled: true,
    mistingHistory: [],
    fertilizingInterval: 30,
    fertilizingHistory: [],
    supplementalLight: null,
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

test("local sync merge does not promote metadata timestamp just because history is merged", () => {
  const local = plant({
    nickname: "Устаревшее имя",
    updatedAt: "2026-08-17T11:00:00.000Z",
    wateringHistory: ["2026-08-01", "2026-08-17"],
  });
  const remote = plant({
    nickname: "Имя с сервера",
    updatedAt: "2026-08-17T12:00:00.000Z",
    wateringHistory: ["2026-08-01"],
  });

  const result = mergeSyncedPlant(local, remote);

  assert.equal(result.nickname, "Имя с сервера");
  assert.equal(result.updatedAt, remote.updatedAt);
  assert.deepEqual(result.wateringHistory, ["2026-08-01", "2026-08-17"]);
});

test("local sync merge does not resurrect a deleted plant from a future-dated active snapshot", () => {
  const local = plant({
    nickname: "Старое активное имя",
    updatedAt: "2026-10-01T12:00:00.000Z",
    deletedAt: null,
  });
  const remote = plant({
    nickname: "Удалённое растение",
    updatedAt: "2026-08-17T12:00:00.000Z",
    deletedAt: "2026-08-17T12:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.equal(result.deletedAt, remote.deletedAt);
  assert.equal(result.nickname, remote.nickname);
  assert.ok(result.updatedAt >= local.updatedAt);
});

test("local photo merge never reinserts a tombstoned primary photo", () => {
  const local = plant({
    photoId: "photo-deleted",
    photoIds: ["photo-deleted", "photo-live"],
    deletedPhotoIds: [],
  });
  const remote = plant({
    photoId: "photo-live",
    photoIds: ["photo-live"],
    deletedPhotoIds: ["photo-deleted"],
    updatedAt: "2026-08-17T12:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.deepEqual(result.photoIds, ["photo-live"]);
  assert.equal(result.photoId, "photo-live");
  assert.deepEqual(result.deletedPhotoIds, ["photo-deleted"]);
});

test("local sync merge selects the latest tombstone even when its update clock is older", () => {
  const local = plant({
    nickname: "Удалено позже с часами назад",
    updatedAt: "2026-08-19T10:00:00.000Z",
    deletedAt: "2026-08-21T10:00:00.000Z",
  });
  const remote = plant({
    nickname: "Удалено раньше",
    updatedAt: "2026-08-22T10:00:00.000Z",
    deletedAt: "2026-08-20T10:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.equal(result.deletedAt, local.deletedAt);
  assert.equal(result.nickname, local.nickname);
  assert.equal(result.updatedAt, remote.updatedAt);
});

test("local sync merge prefers the latest tombstone when both snapshots are deleted", () => {
  const local = plant({
    nickname: "Удалено раньше",
    updatedAt: "2026-08-20T10:00:00.000Z",
    deletedAt: "2026-08-20T10:00:00.000Z",
  });
  const remote = plant({
    nickname: "Удалено позже",
    updatedAt: "2026-08-21T10:00:00.000Z",
    deletedAt: "2026-08-21T10:00:00.000Z",
  });

  const result = mergeSyncedPlant(local, remote);

  assert.equal(result.deletedAt, remote.deletedAt);
  assert.equal(result.nickname, remote.nickname);
});

test("client sync merge sorts photo deletion tombstones deterministically", () => {
  const local = plant({
    deletedPhotoIds: ["photo-z", "photo-a"],
  });
  const remote = plant({
    deletedPhotoIds: ["photo-m", "photo-b"],
    updatedAt: "2026-08-18T10:00:00.000Z",
  });

  const forward = mergeSyncedPlant(local, remote);
  const reverse = mergeSyncedPlant(remote, local);

  assert.deepEqual(forward.deletedPhotoIds, [
    "photo-a",
    "photo-b",
    "photo-m",
    "photo-z",
  ]);
  assert.deepEqual(reverse.deletedPhotoIds, forward.deletedPhotoIds);
});
