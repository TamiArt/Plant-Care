import assert from "node:assert/strict";
import test from "node:test";
import {
  getLatestPlantPhotoId,
  getPlantPhotoIds,
  getPrimaryPlantPhotoId,
} from "../src/features/garden/model/photos.ts";
import {
  buildPhotoGallery,
} from "../src/features/garden/model/photoGallery.ts";
import {
  findMissingPlantPhotoIds,
  getReferencedPlantPhotoIds,
} from "../src/features/garden/model/photoSyncIntegrity.ts";

test("uses the legacy photo as a one-item gallery", () => {
  assert.deepEqual(
    getPlantPhotoIds({
      photoId: "old",
      photoIds: undefined,
    }),
    ["old"],
  );
});

test("limits a plant gallery to three unique photos", () => {
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
    ["one", "two", "three",],
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

test("removing the primary photo falls back to the first remaining photo", () => {
  const result = buildPhotoGallery(
    ["photo-1", "photo-2", "photo-3"],
    "photo-1",
    [
      { photoId: "photo-2" },
      { photoId: "photo-3" },
    ],
    null,
    () => "unused",
  );

  assert.deepEqual(result.photoIds, [
    "photo-2",
    "photo-3",
  ]);
  assert.equal(result.primaryPhotoId, "photo-2");
  assert.deepEqual(result.removedPhotoIds, [
    "photo-1",
  ]);
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

test("photo sync references every photo from every active plant", () => {
  const plants = [
    {
      id: "plant-1",
      photoId: "photo-2",
      photoIds: ["photo-1", "photo-2"],
      deletedAt: null,
    },
    {
      id: "plant-2",
      photoId: "photo-3",
      photoIds: ["photo-3", "photo-4"],
      deletedAt: null,
    },
    {
      id: "plant-3",
      photoId: "photo-5",
      photoIds: ["photo-5"],
      deletedAt: "2026-08-17T12:00:00.000Z",
    },
  ];

  assert.deepEqual(
    getReferencedPlantPhotoIds(plants as never),
    ["photo-1", "photo-2", "photo-3", "photo-4"],
  );
});

test("photo sync detects a missing blob before sync can be considered successful", () => {
  const plants = [
    {
      id: "plant-1",
      photoId: "photo-2",
      photoIds: ["photo-1", "photo-2", "photo-3"],
      deletedAt: null,
    },
  ];

  assert.deepEqual(
    findMissingPlantPhotoIds(
      plants as never,
      ["photo-1", "photo-3"],
    ),
    ["photo-2"],
  );
});

test("photo sync passes when every referenced blob is present", () => {
  const plants = [
    {
      id: "plant-1",
      photoId: "photo-2",
      photoIds: ["photo-1", "photo-2", "photo-3"],
      deletedAt: null,
    },
  ];

  assert.deepEqual(
    findMissingPlantPhotoIds(
      plants as never,
      ["photo-1", "photo-2", "photo-3", "unused"],
    ),
    [],
  );
});


test("tombstoned photos are never returned as active gallery photos", () => {
  assert.deepEqual(
    getPlantPhotoIds({
      photoId: "photo-2",
      photoIds: ["photo-1", "photo-2", "photo-3"],
      deletedPhotoIds: ["photo-1", "photo-3"],
    }),
    ["photo-2"],
  );
});

test("adding a fourth photo does not replace the existing three", () => {
  const result = buildPhotoGallery(
    ["photo-1", "photo-2", "photo-3"],
    "photo-1",
    [
      { photoId: "photo-1" },
      { photoId: "photo-2" },
      { photoId: "photo-3" },
      { photo: "photo-4-data" },
    ],
    null,
    () => "photo-4",
  );

  assert.deepEqual(result.photoIds, [
    "photo-1",
    "photo-2",
    "photo-3",
  ]);
  assert.deepEqual(result.newPhotos, []);
  assert.deepEqual(result.removedPhotoIds, []);
});
