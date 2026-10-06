import type {
  UserPlant,
} from "../types";

import {
  mergeSyncedPlant,
} from "../model/careSyncMerge";

import {
  syncPlantsWithCloud,
  type CloudSyncResult,
} from "./syncRepository";

import {
  syncPhotos,
} from "./photos/syncPhotos";

/**
 * Выполняет полную сетевую синхронизацию.
 *
 * Важно: ответ сервера не становится автоматически единственным
 * источником истины для текущего устройства. После обмена мы ещё раз
 * объединяем серверный результат с исходным локальным snapshot.
 *
 * Это защищает только что добавленные локальные фотографии от потери,
 * если сервер вернул snapshot без них или если сетевой ответ был получен
 * из более старого состояния.
 */
export async function syncGarden(
  localPlants: UserPlant[],
): Promise<CloudSyncResult> {
  const plantResult =
    await syncPlantsWithCloud(
      localPlants,
    );

  const localById =
    new Map(
      localPlants.map(
        plant => [plant.id, plant],
      ),
    );

  const mergedById =
    new Map<string, UserPlant>();

  for (const remotePlant of plantResult.plants) {
    const localPlant =
      localById.get(remotePlant.id);

    mergedById.set(
      remotePlant.id,
      localPlant
        ? mergeSyncedPlant(
            localPlant,
            remotePlant,
          )
        : remotePlant,
    );
  }

  /*
   * Local-only records must also participate in the photo sync. This is
   * especially important for a photo added immediately before sync: the
   * local Blob already exists even if the cloud response does not yet contain
   * its metadata.
   */
  for (const localPlant of localPlants) {
    if (!mergedById.has(localPlant.id)) {
      mergedById.set(
        localPlant.id,
        localPlant,
      );
    }
  }

  const mergedPlants = [
    ...mergedById.values(),
  ];

  await syncPhotos(
    mergedPlants,
  );

  return {
    plants: mergedPlants,
    syncedAt:
      plantResult.syncedAt,
  };
}
