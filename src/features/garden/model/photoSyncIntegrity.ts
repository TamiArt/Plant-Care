import type { UserPlant } from "../types";
import { getPlantPhotoIds } from "./photos";

export function getReferencedPlantPhotoIds(
  plants: UserPlant[],
): string[] {
  return [
    ...new Set(
      plants.flatMap(plant =>
        plant.deletedAt === null
          ? getPlantPhotoIds(plant)
          : [],
      ),
    ),
  ];
}

export function findMissingPlantPhotoIds(
  plants: UserPlant[],
  availablePhotoIds: Iterable<string>,
): string[] {
  const available = new Set(availablePhotoIds);

  return getReferencedPlantPhotoIds(plants).filter(
    photoId => !available.has(photoId),
  );
}
