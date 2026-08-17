import type {
  UserPlant,
} from "../types";

import {
  syncPlantsWithCloud,
  type CloudSyncResult,
} from "./syncRepository";

import {
  syncPhotos,
} from "./photos/syncPhotos";

/**
 * Выполняет только сетевую часть синхронизации.
 *
 * Применение ответа к IndexedDB вынесено отдельно,
 * чтобы оно могло атомарно свериться с изменениями,
 * появившимися пока запрос находился в полёте.
 */
export async function syncGarden(
  localPlants: UserPlant[],
): Promise<CloudSyncResult> {
  const plantResult =
    await syncPlantsWithCloud(
      localPlants,
    );

  await syncPhotos(
    plantResult.plants,
  );

  return plantResult;
}
