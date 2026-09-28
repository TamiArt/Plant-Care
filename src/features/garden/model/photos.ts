import type { UserPlant } from "../types";

export function getPlantPhotoIds(
  plant: Pick<UserPlant, "photoId" | "photoIds">,
): string[] {
  const ids = Array.isArray(plant.photoIds)
    ? plant.photoIds.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0,
      )
    : [];

  if (ids.length === 0 && plant.photoId) {
    ids.push(plant.photoId);
  }

  return [...new Set(ids)];
}

export function getPrimaryPlantPhotoId(
  plant: Pick<UserPlant, "photoId" | "photoIds">,
): string | null {
  const ids = getPlantPhotoIds(plant);

  if (
    plant.photoId &&
    ids.includes(plant.photoId)
  ) {
    return plant.photoId;
  }

  return ids.at(-1) ?? null;
}

// Backward-compatible alias for existing callers.
export function getLatestPlantPhotoId(
  plant: Pick<UserPlant, "photoId" | "photoIds">,
): string | null {
  return getPrimaryPlantPhotoId(plant);
}
