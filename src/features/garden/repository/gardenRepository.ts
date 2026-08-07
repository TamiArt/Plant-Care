import type { PlantPhoto, UserPlant } from "../types";
import { getGardenDb } from "./gardenDb";

export interface SavePlantPhotoInput {
  id: string;
  plantId: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
}

function stripLegacyPhoto(plant: UserPlant): UserPlant {
  const value = plant as UserPlant & { photo?: unknown };

  const {
    photo: _legacyPhoto,
    ...withoutLegacyPhoto
  } = value;

  return {
    ...withoutLegacyPhoto,
    photoId:
      typeof withoutLegacyPhoto.photoId === "string"
        ? withoutLegacyPhoto.photoId
        : null,
  };
}

export async function getAllPlants(): Promise<UserPlant[]> {
  const database = await getGardenDb();
  const plants = await database.getAll("plants");

  return plants.map(stripLegacyPhoto);
}

export async function getPlant(
  plantId: string,
): Promise<UserPlant | undefined> {
  const database = await getGardenDb();
  const plant = await database.get("plants", plantId);

  return plant ? stripLegacyPhoto(plant) : undefined;
}

export async function getPlantPhoto(
  photoId: string,
): Promise<PlantPhoto | undefined> {
  const database = await getGardenDb();
  return database.get("photos", photoId);
}

export async function getAllPlantPhotos(): Promise<PlantPhoto[]> {
  const database = await getGardenDb();
  return database.getAll("photos");
}

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
    await photoStore.put({
      ...newPhoto,
      createdAt: new Date().toISOString(),
    });
  }

  await plantStore.put(stripLegacyPhoto(plant));
  await transaction.done;
}

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
    await plantStore.put(stripLegacyPhoto(plant));
  }

  await transaction.done;
}

export async function getMetaValue<T>(
  key: string,
): Promise<T | undefined> {
  const database = await getGardenDb();
  const record = await database.get("meta", key);

  return record?.value as T | undefined;
}

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
