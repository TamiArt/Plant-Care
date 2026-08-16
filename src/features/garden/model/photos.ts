import type { UserPlant } from "../types";

export const MAX_PLANT_PHOTOS = 3;

export function getPlantPhotoIds(plant: Pick<UserPlant, "photoId" | "photoIds">): string[] {
  const ids = Array.isArray(plant.photoIds)
    ? plant.photoIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (ids.length === 0 && plant.photoId) ids.push(plant.photoId);
  return [...new Set(ids)].slice(-MAX_PLANT_PHOTOS);
}

export function getLatestPlantPhotoId(plant: Pick<UserPlant, "photoId" | "photoIds">): string | null {
  return getPlantPhotoIds(plant).at(-1) ?? null;
}
