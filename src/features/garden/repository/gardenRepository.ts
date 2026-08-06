import type {
  PlantPhoto,
  UserPlant,
} from "../types";

import { getGardenDb } from "./gardenDb";

/**
 * Данные новой фотографии до формирования полной записи PlantPhoto.
 */
export interface SavePlantPhotoInput {
  id: string;
  plantId: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Загружает все растения.
 *
 * Фотографии сюда не включаются.
 */
export async function getAllPlants(): Promise<UserPlant[]> {
  const database = await getGardenDb();

  return database.getAll("plants");
}

/**
 * Возвращает одно растение.
 */
export async function getPlant(
  plantId: string,
): Promise<UserPlant | undefined> {
  const database = await getGardenDb();

  return database.get("plants", plantId);
}

/**
 * Возвращает фотографию как Blob-запись.
 */
export async function getPlantPhoto(
  photoId: string,
): Promise<PlantPhoto | undefined> {
  const database = await getGardenDb();

  return database.get("photos", photoId);
}

/**
 * Возвращает все фотографии.
 *
 * Позже используется для ZIP-экспорта.
 */
export async function getAllPlantPhotos(): Promise<PlantPhoto[]> {
  const database = await getGardenDb();

  return database.getAll("photos");
}

/**
 * Сохраняет растение и при необходимости фотографию
 * в одной транзакции.
 */
export async function savePlant(
  plant: UserPlant,
  newPhoto?: SavePlantPhotoInput | null,
  previousPhotoId?: string | null,
): Promise<void> {
  const database = await getGardenDb();

  const transaction = database.transaction(
    ["plants", "photos"],
    "readwrite",
  );

  const plantStore = transaction.objectStore("plants");
  const photoStore = transaction.objectStore("photos");

  if (
    previousPhotoId &&
    previousPhotoId !== newPhoto?.id
  ) {
    await photoStore.delete(previousPhotoId);
  }

  if (newPhoto) {
    const photoRecord: PlantPhoto = {
      ...newPhoto,
      createdAt: new Date().toISOString(),
    };

    await photoStore.put(photoRecord);
  }

  await plantStore.put(plant);
  await transaction.done;
}

/**
 * Удаляет растение и все фотографии,
 * связанные с ним через индекс by-plant.
 */
export async function deletePlant(
  plant: UserPlant,
): Promise<void> {
  const database = await getGardenDb();

  const transaction = database.transaction(
    ["plants", "photos"],
    "readwrite",
  );

  const plantStore = transaction.objectStore("plants");
  const photoStore = transaction.objectStore("photos");

  await plantStore.delete(plant.id);

  const photoIds = await photoStore
    .index("by-plant")
    .getAllKeys(plant.id);

  for (const photoId of photoIds) {
    await photoStore.delete(photoId);
  }

  await transaction.done;
}

/**
 * Полностью заменяет список растений.
 *
 * Пока этот метод не изменяет фотографии.
 */
export async function replacePlants(
  plants: UserPlant[],
): Promise<void> {
  const database = await getGardenDb();

  const transaction = database.transaction(
    "plants",
    "readwrite",
  );

  const plantStore = transaction.objectStore("plants");

  await plantStore.clear();

  for (const plant of plants) {
    await plantStore.put(plant);
  }

  await transaction.done;
}

/**
 * Читает служебную запись.
 */
export async function getMetaValue<T>(
  key: string,
): Promise<T | undefined> {
  const database = await getGardenDb();
  const record = await database.get("meta", key);

  return record?.value as T | undefined;
}

/**
 * Сохраняет служебную запись.
 */
export async function setMetaValue(
  key: string,
  value: unknown,
): Promise<void> {
  const database = await getGardenDb();

  await database.put("meta", {
    key,
    value,
  });
}