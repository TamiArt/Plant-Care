import type {
  UserPlant,
} from "../types";

import {
  getAllPlantRecords,
} from "../repository/gardenRepository";

import {
  syncPlantsWithCloud,
  type CloudSyncResult,
} from "./syncRepository";

import {
  syncPhotos,
} from "./photos/syncPhotos";

import {
  reconcilePlantSync,
} from "./reconcilePlants";

/**
 * Полная синхронизация сада.
 *
 * Здесь находится orchestration:
 * metadata -> photos -> финальная сверка
 * с актуальным локальным IndexedDB.
 */
export async function syncGarden(
  sentPlants: UserPlant[],
): Promise<CloudSyncResult> {
  /*
   * ШАГ 1.
   *
   * Отправляем snapshot, который был актуален
   * на момент старта синхронизации.
   */
  const plantResult =
    await syncPlantsWithCloud(
      sentPlants,
    );

  /*
   * ШАГ 2.
   *
   * Синхронизируем фотографии по серверному
   * результату. Пока это выполняется, пользователь
   * всё ещё может изменить растение локально.
   */
  await syncPhotos(
    plantResult.plants,
  );

  /*
   * ШАГ 3.
   *
   * Читаем IndexedDB повторно ПОСЛЕ всех сетевых
   * операций. Если за время запроса появился полив,
   * заметка или другое изменение, устаревший ответ
   * сервера не имеет права его стереть.
   */
  const latestLocalPlants =
    await getAllPlantRecords();

  return {
    ...plantResult,
    plants: reconcilePlantSync(
      sentPlants,
      latestLocalPlants,
      plantResult.plants,
    ),
  };
}
