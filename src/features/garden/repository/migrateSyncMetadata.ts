import type {
  UserPlant,
} from "../types";

import {
  getGardenDb,
} from "./gardenDb";

const MIGRATION_META_KEY =
  "plant-sync-metadata-v1";

function isValidIsoDate(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(
      Date.parse(value),
    )
  );
}

function createdAtFromPlant(
  plant: Partial<UserPlant>,
  fallback: string,
): string {
  if (
    isValidIsoDate(
      plant.createdAt,
    )
  ) {
    return plant.createdAt;
  }

  if (
    typeof plant.addedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      plant.addedAt,
    )
  ) {
    return `${plant.addedAt}T00:00:00.000Z`;
  }

  return fallback;
}

/**
 * Одноразово добавляет существующим растениям:
 *
 * createdAt
 * updatedAt
 * deletedAt
 *
 * Существующим растениям updatedAt намеренно
 * ставится время миграции, чтобы при первой
 * синхронизации они гарантированно ушли в облако.
 */
export async function migrateSyncMetadata():
  Promise<void> {
  const database =
    await getGardenDb();

  const state =
    await database.get(
      "meta",
      MIGRATION_META_KEY,
    );

  if (state?.value === true) {
    return;
  }

  const migrationTime =
    new Date().toISOString();

  const transaction =
    database.transaction(
      ["plants", "meta"],
      "readwrite",
    );

  const plantStore =
    transaction.objectStore(
      "plants",
    );

  const plants =
    await plantStore.getAll();

  for (const rawPlant of plants) {
    const plant =
      rawPlant as UserPlant;

    const createdAt =
      createdAtFromPlant(
        plant,
        migrationTime,
      );

    const updatedAt =
      isValidIsoDate(
        plant.updatedAt,
      )
        ? plant.updatedAt
        : migrationTime;

    const deletedAt =
      isValidIsoDate(
        plant.deletedAt,
      )
        ? plant.deletedAt
        : null;

    await plantStore.put({
      ...plant,
      createdAt,
      updatedAt,
      deletedAt,
    });
  }

  await transaction
    .objectStore("meta")
    .put({
      key: MIGRATION_META_KEY,
      value: true,
    });

  await transaction.done;
}