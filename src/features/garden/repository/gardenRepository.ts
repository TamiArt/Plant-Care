import type {
  PlantPhoto,
  UserPlant,
} from "../types";

import {
  getGardenDb,
} from "./gardenDb";

export interface SavePlantPhotoInput {
  id: string;
  plantId: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
}

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

function normalizePlantRecord(
  plant: UserPlant,
): UserPlant {
  const value =
    plant as UserPlant & {
      photo?: unknown;
    };

  const {
    photo: _legacyPhoto,
    ...withoutLegacyPhoto
  } = value;

  const fallback =
    new Date().toISOString();

  const addedAt =
    typeof withoutLegacyPhoto
      .addedAt === "string"
      ? withoutLegacyPhoto
          .addedAt
      : fallback.slice(0, 10);

  const createdAt =
    isValidIsoDate(
      withoutLegacyPhoto
        .createdAt,
    )
      ? withoutLegacyPhoto
          .createdAt
      : /^\d{4}-\d{2}-\d{2}$/.test(
            addedAt,
          )
        ? `${addedAt}T00:00:00.000Z`
        : fallback;

  return {
    ...withoutLegacyPhoto,

    photoId:
      typeof withoutLegacyPhoto
        .photoId === "string"
        ? withoutLegacyPhoto
            .photoId
        : null,

    createdAt,

    updatedAt:
      isValidIsoDate(
        withoutLegacyPhoto
          .updatedAt,
      )
        ? withoutLegacyPhoto
            .updatedAt
        : fallback,

    deletedAt:
      isValidIsoDate(
        withoutLegacyPhoto
          .deletedAt,
      )
        ? withoutLegacyPhoto
            .deletedAt
        : null,
  };
}

/**
 * Только активные растения.
 *
 * Используется UI.
 */
export async function getAllPlants():
  Promise<UserPlant[]> {
  const records =
    await getAllPlantRecords();

  return records.filter(
    plant =>
      plant.deletedAt ===
      null,
  );
}

/**
 * Все записи, включая tombstones.
 *
 * Используется синхронизацией.
 */
export async function getAllPlantRecords():
  Promise<UserPlant[]> {
  const database =
    await getGardenDb();

  const plants =
    await database.getAll(
      "plants",
    );

  return plants.map(
    normalizePlantRecord,
  );
}

export async function getPlant(
  plantId: string,
): Promise<
  UserPlant | undefined
> {
  const database =
    await getGardenDb();

  const plant =
    await database.get(
      "plants",
      plantId,
    );

  return plant
    ? normalizePlantRecord(
        plant,
      )
    : undefined;
}

export async function getPlantPhoto(
  photoId: string,
): Promise<
  PlantPhoto | undefined
> {
  const database =
    await getGardenDb();

  return database.get(
    "photos",
    photoId,
  );
}

export async function getAllPlantPhotos():
  Promise<PlantPhoto[]> {
  const database =
    await getGardenDb();

  return database.getAll(
    "photos",
  );
}

export async function savePlant(
  plant: UserPlant,
  newPhoto?:
    | SavePlantPhotoInput
    | null,
  previousPhotoId?:
    | string
    | null,
): Promise<void> {
  const database =
    await getGardenDb();

  const transaction =
    database.transaction(
      [
        "plants",
        "photos",
      ],
      "readwrite",
    );

  const plantStore =
    transaction.objectStore(
      "plants",
    );

  const photoStore =
    transaction.objectStore(
      "photos",
    );

  if (
    previousPhotoId &&
    previousPhotoId !==
      newPhoto?.id
  ) {
    await photoStore.delete(
      previousPhotoId,
    );
  }

  if (newPhoto) {
    await photoStore.put({
      ...newPhoto,

      createdAt:
        new Date()
          .toISOString(),
    });
  }

  await plantStore.put(
    normalizePlantRecord(
      plant,
    ),
  );

  await transaction.done;
}

/**
 * Soft delete растения.
 *
 * Сам объект остаётся в IndexedDB
 * для передачи tombstone на другие
 * устройства.
 *
 * Локальный Blob фотографии можно
 * удалить сразу, потому что растение
 * пользователь уже удалил.
 */
export async function softDeletePlant(
  plant: UserPlant,
): Promise<void> {
  const database =
    await getGardenDb();

  const transaction =
    database.transaction(
      [
        "plants",
        "photos",
      ],
      "readwrite",
    );

  const plantStore =
    transaction.objectStore(
      "plants",
    );

  const photoStore =
    transaction.objectStore(
      "photos",
    );

  await plantStore.put(
    normalizePlantRecord(
      plant,
    ),
  );

  const photoIds =
    await photoStore
      .index("by-plant")
      .getAllKeys(
        plant.id,
      );

  for (
    const photoId
    of photoIds
  ) {
    await photoStore.delete(
      photoId,
    );
  }

  await transaction.done;
}

/**
 * Заменяет только набор растений.
 *
 * Используется импортом резервной копии.
 */
export async function replacePlants(
  plants: UserPlant[],
): Promise<void> {
  const database =
    await getGardenDb();

  const transaction =
    database.transaction(
      "plants",
      "readwrite",
    );

  const plantStore =
    transaction.objectStore(
      "plants",
    );

  await plantStore.clear();

  for (const plant of plants) {
    await plantStore.put(
      normalizePlantRecord(
        plant,
      ),
    );
  }

  await transaction.done;
}

/**
 * Полностью заменяет локальный набор
 * серверным результатом синхронизации.
 *
 * Здесь tombstones сохраняются.
 */
export async function replaceAllPlantRecords(
  plants: UserPlant[],
): Promise<void> {
  const database =
    await getGardenDb();

  const transaction =
    database.transaction(
      "plants",
      "readwrite",
    );

  const plantStore =
    transaction.objectStore(
      "plants",
    );

  await plantStore.clear();

  for (const plant of plants) {
    await plantStore.put(
      normalizePlantRecord(
        plant,
      ),
    );
  }

  await transaction.done;
}

export async function getMetaValue<T>(
  key: string,
): Promise<T | undefined> {
  const database =
    await getGardenDb();

  const record =
    await database.get(
      "meta",
      key,
    );

  return record?.value as
    | T
    | undefined;
}

export async function setMetaValue(
  key: string,
  value: unknown,
): Promise<void> {
  const database =
    await getGardenDb();

  await database.put(
    "meta",
    {
      key,
      value,
    },
  );
}

export async function saveDownloadedPhoto(
  photo: PlantPhoto,
): Promise<void> {
  const database =
    await getGardenDb();

  await database.put(
    "photos",
    photo,
  );
}