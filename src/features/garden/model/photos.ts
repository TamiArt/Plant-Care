import type { UserPlant } from "../types";

type PlantPhotoFields = Pick<
  UserPlant,
  "photoId" | "photoIds"
> &
  Partial<Pick<UserPlant, "deletedPhotoIds">>;

export function getPlantPhotoIds(
  plant: PlantPhotoFields,
): string[] {
  const deleted = new Set(
    Array.isArray(plant.deletedPhotoIds)
      ? plant.deletedPhotoIds
      : [],
  );

  const ids = Array.isArray(plant.photoIds)
    ? plant.photoIds.filter(
        (id): id is string =>
          typeof id === "string" &&
          id.length > 0 &&
          !deleted.has(id),
      )
    : [];

  if (
    ids.length === 0 &&
    plant.photoId &&
    !deleted.has(plant.photoId)
  ) {
    ids.push(plant.photoId);
  }

  return [...new Set(ids)];
}

export function getPrimaryPlantPhotoId(
  plant: PlantPhotoFields,
): string | null {
  const ids = getPlantPhotoIds(plant);

  if (
    plant.photoId &&
    ids.includes(plant.photoId)
  ) {
    return plant.photoId;
  }

  return ids[0] ?? null;
}

// Backward-compatible alias for existing callers.
export function getLatestPlantPhotoId(
  plant: PlantPhotoFields,
): string | null {
  return getPrimaryPlantPhotoId(plant);
}
