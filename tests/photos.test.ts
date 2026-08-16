import assert from "node:assert/strict";
import test from "node:test";
import { getLatestPlantPhotoId, getPlantPhotoIds, MAX_PLANT_PHOTOS } from "../src/features/garden/model/photos.ts";

test("uses the legacy photo as a one-item gallery", () => {
  assert.deepEqual(getPlantPhotoIds({ photoId: "old", photoIds: undefined }), ["old"]);
});

test("keeps no more than three unique photos and uses the newest as cover", () => {
  const plant = { photoId: "legacy", photoIds: ["one", "two", "two", "three", "four"] };
  assert.equal(MAX_PLANT_PHOTOS, 3);
  assert.deepEqual(getPlantPhotoIds(plant), ["two", "three", "four"]);
  assert.equal(getLatestPlantPhotoId(plant), "four");
});

test("plant without photos has no cover", () => {
  assert.equal(getLatestPlantPhotoId({ photoId: null, photoIds: [] }), null);
});
