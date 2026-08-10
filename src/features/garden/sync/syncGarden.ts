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
 * Полная синхронизация сада.
 *
 * Здесь только orchestration.
 *
 * Алгоритм растений, HTTP и фотографии
 * находятся в отдельных модулях.
 */
export async function syncGarden(
  localPlants: UserPlant[],
): Promise<CloudSyncResult> {
  /*
   * ШАГ 1.
   *
   * Сначала синхронизируем метаданные
   * растений.
   *
   * Это критично для фотографий:
   * сервер должен сначала узнать
   * актуальный plant.photoId.
   */
  const plantResult =
    await syncPlantsWithCloud(
      localPlants,
    );

  /*
   * plantResult.plants —
   * авторитетный LWW-результат.
   *
   * Именно по нему определяем,
   * какие photoId являются актуальными.
   */
  await syncPhotos(
    plantResult.plants,
  );

  return plantResult;
}