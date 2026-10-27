import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSyncPlant,
} from "../worker/syncPlantsRepository.ts";

function plant(overrides: Record<string, unknown> = {}) {
  return {
    id: "plant-1",
    nickname: "Монстера",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
    deletedAt: null,
    photoId: null,
    photoIds: [],
    deletedPhotoIds: [],
    ...overrides,
  };
}

test("does not restore a deleted primary photo while normalizing incoming sync data", () => {
  const result = normalizeSyncPlant(plant({
    photoId: "photo-deleted",
    photoIds: ["photo-live"],
    deletedPhotoIds: ["photo-deleted"],
  }));

  assert.deepEqual(result.photoIds, ["photo-live"]);
  assert.deepEqual(result.deletedPhotoIds, ["photo-deleted"]);
  assert.equal(result.photoId, "photo-live");
});

test("keeps normalized gallery within three photos when primary is missing from photoIds", () => {
  const result = normalizeSyncPlant(plant({
    photoId: "photo-primary",
    photoIds: ["photo-1", "photo-2", "photo-3"],
  }));

  assert.equal(result.photoIds.length, 3);
  assert.ok(result.photoIds.includes("photo-primary"));
  assert.equal(result.photoId, "photo-primary");
});
