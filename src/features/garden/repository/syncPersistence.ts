import type {
  UserPlant,
} from "../types";

import {
  getGardenDb,
} from "./gardenDb";

export type PlantSyncResolver = (
  currentPlants: UserPlant[],
) => UserPlant[];

/**
 * Читает актуальное локальное состояние,
 * вычисляет итог sync и записывает его в рамках
 * одной readwrite-транзакции IndexedDB.
 *
 * Поэтому локальный savePlant не может оказаться
 * между финальным чтением и заменой набора растений.
 */
export async function persistSyncedPlants(
  resolve: PlantSyncResolver,
): Promise<UserPlant[]> {
  const database =
    await getGardenDb();

  const transaction =
    database.transaction(
      "plants",
      "readwrite",
    );

  const store =
    transaction.objectStore(
      "plants",
    );

  const currentPlants =
    await store.getAll();

  const resolvedPlants =
    resolve(
      currentPlants as UserPlant[],
    );

  await store.clear();

  for (const plant of resolvedPlants) {
    await store.put(plant);
  }

  await transaction.done;

  return resolvedPlants;
}
