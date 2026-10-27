import assert from "node:assert/strict";
import test from "node:test";

import {
  hasAllCareHistory,
  hasAllPhotoTombstones,
  mergeCareHistoryPlant,
} from "../worker/syncMerge.ts";

function plant(overrides: Record<string, unknown> = {}) {
  return {
    id: "plant-1",
    nickname: "Monstera",
    photoId: "photo-live",
    photoIds: ["photo-live"],
    deletedPhotoIds: [],
    updatedAt: "2026-10-27T10:00:00.000Z",
    wateringHistory: ["2026-10-01"],
    mistingHistory: [],
    fertilizingHistory: [],
    deletedAt: null,
    ...overrides,
  };
}

function merge(remote: ReturnType<typeof plant>, incoming: ReturnType<typeof plant>) {
  return mergeCareHistoryPlant(remote, incoming, "2026-10-27T12:00:00.000Z");
}

test("concurrent device updates converge on all care events and photo tombstones in either order", () => {
  const initial = plant();
  const deviceA = plant({
    updatedAt: "2026-10-27T10:01:00.000Z",
    wateringHistory: ["2026-10-01", "2026-10-27"],
    photoIds: ["photo-live", "photo-a"],
    deletedPhotoIds: ["photo-old-a"],
  });
  const deviceB = plant({
    updatedAt: "2026-10-27T10:02:00.000Z",
    mistingHistory: ["2026-10-27"],
    photoIds: ["photo-live", "photo-b"],
    deletedPhotoIds: ["photo-old-b"],
  });

  // Model two writes that both started from the same previously-read snapshot.
  const afterAThenB = merge(merge(initial, deviceA), deviceB);
  const afterBThenA = merge(merge(initial, deviceB), deviceA);

  for (const result of [afterAThenB, afterBThenA]) {
    assert.deepEqual(result.wateringHistory, ["2026-10-01", "2026-10-27"]);
    assert.deepEqual(result.mistingHistory, ["2026-10-27"]);
    assert.deepEqual(result.deletedPhotoIds, ["photo-old-a", "photo-old-b"]);
    assert.ok(!result.photoIds.some(id => result.deletedPhotoIds.includes(id)));
    assert.equal(hasAllCareHistory(result, deviceA), true);
    assert.equal(hasAllCareHistory(result, deviceB), true);
    assert.equal(hasAllPhotoTombstones(result, deviceA), true);
    assert.equal(hasAllPhotoTombstones(result, deviceB), true);
  }

  assert.deepEqual(afterAThenB.wateringHistory, afterBThenA.wateringHistory);
  assert.deepEqual(afterAThenB.mistingHistory, afterBThenA.mistingHistory);
  assert.deepEqual(afterAThenB.deletedPhotoIds, afterBThenA.deletedPhotoIds);
});

test("post-write verification detects a lost care event or photo deletion under a stale overwrite", () => {
  const candidate = plant({
    wateringHistory: ["2026-10-01", "2026-10-27"],
    deletedPhotoIds: ["photo-deleted"],
  });
  const stalePersisted = plant();

  assert.equal(hasAllCareHistory(stalePersisted, candidate), false);
  assert.equal(hasAllPhotoTombstones(stalePersisted, candidate), false);
});

test("post-write verification accepts a persisted union of concurrent histories and tombstones", () => {
  const first = plant({
    wateringHistory: ["2026-10-01", "2026-10-27"],
    deletedPhotoIds: ["photo-deleted-a"],
  });
  const second = plant({
    mistingHistory: ["2026-10-27"],
    deletedPhotoIds: ["photo-deleted-b"],
  });
  const persisted = merge(first, second);

  assert.equal(hasAllCareHistory(persisted, first), true);
  assert.equal(hasAllCareHistory(persisted, second), true);
  assert.equal(hasAllPhotoTombstones(persisted, first), true);
  assert.equal(hasAllPhotoTombstones(persisted, second), true);
});

test("a deleted plant cannot be resurrected by a concurrent active snapshot with a future clock", () => {
  const deleted = plant({
    nickname: "Deleted",
    deletedAt: "2026-10-27T10:05:00.000Z",
    updatedAt: "2026-10-27T10:05:00.000Z",
  });
  const staleActive = plant({
    nickname: "Stale active",
    deletedAt: null,
    updatedAt: "2030-01-01T00:00:00.000Z",
    wateringHistory: ["2026-10-01", "2026-10-27"],
  });

  const result = merge(deleted, staleActive);

  assert.equal(result.deletedAt, deleted.deletedAt);
  assert.equal(result.nickname, deleted.nickname);
  assert.deepEqual(result.wateringHistory, staleActive.wateringHistory);
});
