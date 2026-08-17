import type {
  UserPlant,
} from "../types";

import {
  persistSyncedPlants,
} from "../repository/syncPersistence";

import {
  reconcilePlantSync,
} from "./reconcilePlants";

/**
 * Применяет ответ сервера к IndexedDB без потери
 * изменений, появившихся во время сетевого запроса.
 */
export async function applySyncResult(
  sentPlants: UserPlant[],
  remotePlants: UserPlant[],
): Promise<UserPlant[]> {
  return persistSyncedPlants(
    currentPlants =>
      reconcilePlantSync(
        sentPlants,
        currentPlants,
        remotePlants,
      ),
  );
}
