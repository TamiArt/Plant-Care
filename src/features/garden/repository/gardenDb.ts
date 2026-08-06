import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
} from "idb";

import type {
  PlantPhoto,
  UserPlant,
} from "../types";

/**
 * Имя базы в браузере.
 *
 * В Chrome DevTools она появится как:
 * Application → IndexedDB → plantcare
 */
const DATABASE_NAME = "plantcare";

/**
 * Версия структуры IndexedDB.
 *
 * Повышаем это число только при изменении схемы:
 * - создании нового object store;
 * - создании или удалении индекса;
 * - изменении ключей.
 */
const DATABASE_VERSION = 1;

/**
 * Служебные данные базы.
 *
 * Здесь будут храниться:
 * - отметка о завершённой миграции localStorage;
 * - версия миграции;
 * - другие технические флаги.
 */
export interface GardenMetaRecord {
  key: string;
  value: unknown;
}

/**
 * Типизированная схема IndexedDB.
 */
export interface PlantCareDatabaseSchema extends DBSchema {
  /**
   * Растения без бинарных фотографий.
   */
  plants: {
    key: string;
    value: UserPlant;
  };

  /**
   * Фотографии как Blob.
   */
  photos: {
    key: string;
    value: PlantPhoto;

    indexes: {
      /**
       * Позволяет найти фотографии по идентификатору растения.
       */
      "by-plant": string;
    };
  };

  /**
   * Служебные записи.
   */
  meta: {
    key: string;
    value: GardenMetaRecord;
  };
}

/**
 * Кэшируем Promise, чтобы приложение не открывало
 * несколько соединений с одной базой.
 */
let databasePromise:
  | Promise<IDBPDatabase<PlantCareDatabaseSchema>>
  | null = null;

/**
 * Открывает базу и создаёт её при первом запуске.
 *
 * Никакая отдельная регистрация IndexedDB не требуется.
 * База создаётся браузером после первого вызова этой функции.
 */
export function getGardenDb():
  Promise<IDBPDatabase<PlantCareDatabaseSchema>> {
  if (!databasePromise) {
    databasePromise = openDB<PlantCareDatabaseSchema>(
      DATABASE_NAME,
      DATABASE_VERSION,
      {
        upgrade(database) {
          if (!database.objectStoreNames.contains("plants")) {
            database.createObjectStore("plants", {
              keyPath: "id",
            });
          }

          if (!database.objectStoreNames.contains("photos")) {
            const photoStore = database.createObjectStore(
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

          if (!database.objectStoreNames.contains("meta")) {
            database.createObjectStore("meta", {
              keyPath: "key",
            });
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