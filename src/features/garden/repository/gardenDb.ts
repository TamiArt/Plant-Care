import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
} from "idb";

import type {
  PlantPhoto,
  UserPlant,
} from "../types";

const DATABASE_NAME =
  "plantcare";

/**
 * Версию повышаем только когда меняется
 * физическая структура IndexedDB:
 *
 * - новый object store;
 * - новый индекс;
 * - удаление store/index.
 *
 * createdAt / updatedAt / deletedAt —
 * обычные поля объекта, поэтому VERSION
 * сейчас остаётся 1.
 */
const DATABASE_VERSION = 1;

export interface GardenMetaRecord {
  key: string;
  value: unknown;
}

export interface PlantCareDatabaseSchema
  extends DBSchema {
  plants: {
    key: string;
    value: UserPlant;
  };

  photos: {
    key: string;
    value: PlantPhoto;

    indexes: {
      "by-plant": string;
    };
  };

  meta: {
    key: string;
    value: GardenMetaRecord;
  };
}

let databasePromise:
  | Promise<
      IDBPDatabase<
        PlantCareDatabaseSchema
      >
    >
  | null = null;

export function getGardenDb():
  Promise<
    IDBPDatabase<
      PlantCareDatabaseSchema
    >
  > {
  if (!databasePromise) {
    databasePromise =
      openDB<
        PlantCareDatabaseSchema
      >(
        DATABASE_NAME,
        DATABASE_VERSION,
        {
          upgrade(database) {
            if (
              !database.objectStoreNames
                .contains("plants")
            ) {
              database.createObjectStore(
                "plants",
                {
                  keyPath: "id",
                },
              );
            }

            if (
              !database.objectStoreNames
                .contains("photos")
            ) {
              const photoStore =
                database.createObjectStore(
                  "photos",
                  {
                    keyPath: "id",
                  },
                );

              photoStore.createIndex(
                "by-plant",
                "plantId",
                {
                  unique: false,
                },
              );
            }

            if (
              !database.objectStoreNames
                .contains("meta")
            ) {
              database.createObjectStore(
                "meta",
                {
                  keyPath: "key",
                },
              );
            }
          },

          blocked() {
            console.warn(
              "Обновление IndexedDB заблокировано другой вкладкой PlantCare.",
            );
          },

          blocking() {
            console.warn(
              "Текущая вкладка блокирует обновление IndexedDB.",
            );
          },

          terminated() {
            databasePromise = null;

            console.error(
              "Соединение с IndexedDB было неожиданно закрыто.",
            );
          },
        },
      );
  }

  return databasePromise;
}