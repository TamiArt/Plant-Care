import assert from "node:assert/strict";
import test from "node:test";
import {
  getLatestPlantPhotoId,
  getPlantPhotoIds,
  getPrimaryPlantPhotoId,
} from "../src/features/garden/model/photos.ts";

test("uses the legacy photo as a one-item gallery", () => {
  assert.deepEqual(
    getPlantPhotoIds({
      photoId: "old",
      photoIds: undefined,
    }),
    ["old"],
  );
});

test("keeps every unique photo instead of truncating the gallery", () => {
  const plant = {
    photoId: "three",
    photoIds: [
      "one",
      "two",
      "two",
      "three",
      "four",
    ],
  };

  assert.deepEqual(
    getPlantPhotoIds(plant),
    ["one", "two", "three", "four"],
  );
});

test("uses the selected photo as the primary photo", () => {
  const plant = {
    photoId: "two",
    photoIds: ["one", "two", "three", "four"],
  };

  assert.equal(
    getPrimaryPlantPhotoId(plant),
    "two",
  );
  assert.equal(
    getLatestPlantPhotoId(plant),
    "two",
  );
});

test("falls back to the latest photo for legacy records", () => {
  assert.equal(
    getPrimaryPlantPhotoId({
      photoId: null,
      photoIds: ["one", "two"],
    }),
    "two",
  );
});

test("plant without photos has no primary photo", () => {
  assert.equal(
    getPrimaryPlantPhotoId({
      photoId: null,
      photoIds: [],
    }),
    null,
  );
});
