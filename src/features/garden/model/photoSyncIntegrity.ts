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


/**
 * Finds photo IDs that the server did not acknowledge as belonging to the
 * same plant after a metadata sync. Uploading these IDs would predictably
 * produce HTTP 409 from PUT /api/photos/:id.
 */
export function findUnconfirmedPhotoReferences(
  localPlants: UserPlant[],
  remotePlants: UserPlant[],
): Array<{ plantId: string; photoId: string }> {
  const remoteById = new Map(
    remotePlants.map(plant => [plant.id, plant]),
  );

  const conflicts: Array<{ plantId: string; photoId: string }> = [];

  for (const plant of localPlants) {
    if (plant.deletedAt !== null) continue;

    const remote = remoteById.get(plant.id);
    const remotePhotoIds = new Set(
      remote ? getPlantPhotoIds(remote) : [],
    );

    for (const photoId of getPlantPhotoIds(plant)) {
      if (!remotePhotoIds.has(photoId)) {
        conflicts.push({ plantId: plant.id, photoId });
      }
    }
  }

  return conflicts;
}
