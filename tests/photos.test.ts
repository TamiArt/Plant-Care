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

test("uses the first photo as the default primary", () => {
  assert.equal(
    getPrimaryPlantPhotoId({
      photoId: null,
      photoIds: ["one", "two"],
    }),
    "one",
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


import { buildPhotoGallery } from "../src/features/garden/model/photoGallery.ts";

test("adding two photos to an existing photo keeps all three after save preparation", () => {
  let nextId = 4;
  const result = buildPhotoGallery(
    ["photo-1"],
    "photo-1",
    [
      { photoId: "photo-1" },
      { photo: "photo-2-data" },
      { photo: "photo-3-data" },
    ],
    null,
    () => `photo-${nextId++}`,
  );

  assert.deepEqual(result.photoIds, [
    "photo-1",
    "photo-4",
    "photo-5",
  ]);
  assert.equal(result.primaryPhotoId, "photo-1");
  assert.equal(result.newPhotos.length, 2);
  assert.deepEqual(result.removedPhotoIds, []);
});

test("removing one photo only removes that photo from the desired gallery", () => {
  const result = buildPhotoGallery(
    ["photo-1", "photo-2", "photo-3"],
    "photo-1",
    [
      { photoId: "photo-1" },
      { photoId: "photo-3" },
    ],
    null,
    () => "unused",
  );

  assert.deepEqual(result.photoIds, [
    "photo-1",
    "photo-3",
  ]);
  assert.deepEqual(result.removedPhotoIds, [
    "photo-2",
  ]);
  assert.equal(result.primaryPhotoId, "photo-1");
});

test("explicit primary selection changes only the primary photo, not the gallery", () => {
  const result = buildPhotoGallery(
    ["photo-1", "photo-2", "photo-3"],
    "photo-1",
    [
      { photoId: "photo-1" },
      { photoId: "photo-2" },
      { photoId: "photo-3" },
    ],
    2,
    () => "unused",
  );

  assert.deepEqual(result.photoIds, [
    "photo-1",
    "photo-2",
    "photo-3",
  ]);
  assert.equal(result.primaryPhotoId, "photo-3");
  assert.deepEqual(result.removedPhotoIds, []);
});
