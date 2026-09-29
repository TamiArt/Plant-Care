import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSyncPlant,
} from "../worker/syncPlantsRepository.ts";

test("server normalization keeps the primary photo inside the complete gallery", () => {
  const result = normalizeSyncPlant({
    id: "plant-1",
    nickname: "Монстера",
    photoId: "photo-3",
    photoIds: ["photo-1", "photo-2"],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
  });

  assert.deepEqual(result.photoIds, [
    "photo-3",
    "photo-1",
    "photo-2",
  ]);
  assert.equal(result.photoId, "photo-3");
});

test("server normalization removes duplicate photo IDs without truncating the gallery", () => {
  const result = normalizeSyncPlant({
    id: "plant-1",
    nickname: "Монстера",
    photoId: "photo-1",
    photoIds: [
      "photo-1",
      "photo-2",
      "photo-2",
      "photo-3",
      "photo-4",
      "photo-5",
    ],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
  });

  assert.deepEqual(result.photoIds, [
    "photo-1",
    "photo-2",
    "photo-3",
    "photo-4",
    "photo-5",
  ]);
});

test("server normalization uses the first gallery photo when no primary is selected", () => {
  const result = normalizeSyncPlant({
    id: "plant-1",
    nickname: "Монстера",
    photoId: null,
    photoIds: [
      "photo-1",
      "photo-2",
      "photo-3",
    ],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
  });

  assert.equal(result.photoId, "photo-1");
});
