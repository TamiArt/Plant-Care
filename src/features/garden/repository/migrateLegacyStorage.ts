import type {
  PlantLocation,
  PlantPhoto,
  UserPlant,
} from "../types";
import {
  dataUrlToFile,
  preparePhoto,
} from "../services/preparePhoto";
import { getGardenDb } from "./gardenDb";

const LEGACY_STORAGE_KEY = "plantcare_v1";
const MIGRATION_META_KEY = "legacy-local-storage-migrated-v1";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string",
      )
    : [];
}

function createId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

function normalizeLocation(value: unknown): PlantLocation {
  return value === "outdoor" ? "outdoor" : "home";
}

function normalizePlant(
  value: UnknownRecord,
  photoId: string | null,
): UserPlant | null {
  if (
    typeof value.id !== "string" ||
    typeof value.nickname !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    catalogId:
      typeof value.catalogId === "string"
        ? value.catalogId
        : null,
    customName:
      typeof value.customName === "string"
        ? value.customName
        : undefined,
    customLatinName:
      typeof value.customLatinName === "string"
        ? value.customLatinName
        : undefined,
    customDescription:
      typeof value.customDescription === "string"
        ? value.customDescription
        : undefined,
    customEmoji:
      typeof value.customEmoji === "string"
        ? value.customEmoji
        : undefined,
    nickname: value.nickname,
    photoId,
    wateringInterval:
      typeof value.wateringInterval === "number"
        ? value.wateringInterval
        : 7,
    wateringHistory: stringArray(value.wateringHistory),
    mistingHistory: stringArray(value.mistingHistory),
    fertilizingInterval:
      typeof value.fertilizingInterval === "number"
        ? value.fertilizingInterval
        : 30,
    fertilizingHistory: stringArray(
      value.fertilizingHistory,
    ),
    addedAt:
      typeof value.addedAt === "string"
        ? value.addedAt
        : new Date().toISOString().split("T")[0],
    location: normalizeLocation(value.location),
    notes: Array.isArray(value.notes)
      ? (value.notes as UserPlant["notes"])
      : [],
    reminders: Array.isArray(value.reminders)
      ? (value.reminders as UserPlant["reminders"])
      : [],
externalTaxon: isRecord(value.externalTaxon)
  ? (
      value.externalTaxon as unknown as
        UserPlant["externalTaxon"]
    )
  : undefined,
  };
}

export async function migrateLegacyStorage(): Promise<void> {
  const database = await getGardenDb();
  const migrationState = await database.get(
    "meta",
    MIGRATION_META_KEY,
  );

  if (migrationState?.value === true) {
    return;
  }

  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!raw) {
    await database.put("meta", {
      key: MIGRATION_META_KEY,
      value: true,
    });
    return;
  }

  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Старые данные сада повреждены. LocalStorage не был удалён.",
    );
  }

  const plants: UserPlant[] = [];
  const photos: PlantPhoto[] = [];

  /*
   * Обработка фотографий выполняется до открытия транзакции.
   * Иначе IndexedDB может автоматически закрыть транзакцию
   * во время длительной работы canvas.
   */
  for (const item of parsed) {
    if (!isRecord(item)) {
      continue;
    }

    let photoId: string | null = null;

    if (
      typeof item.photo === "string" &&
      item.photo.startsWith("data:image/")
    ) {
      const file = await dataUrlToFile(
        item.photo,
        `legacy-${typeof item.id === "string" ? item.id : "plant"}`,
      );
      const prepared = await preparePhoto(file);

      photoId = createId();

      photos.push({
        id: photoId,
        plantId:
          typeof item.id === "string"
            ? item.id
            : createId(),
        blob: prepared.blob,
        mimeType: prepared.mimeType,
        width: prepared.width,
        height: prepared.height,
        createdAt: new Date().toISOString(),
      });
    }

    const plant = normalizePlant(item, photoId);

    if (plant) {
      plants.push(plant);
    }
  }

  const transaction = database.transaction(
    ["plants", "photos", "meta"],
    "readwrite",
  );

  const plantStore = transaction.objectStore("plants");
  const photoStore = transaction.objectStore("photos");

  for (const plant of plants) {
    await plantStore.put(plant);
  }

  for (const photo of photos) {
    await photoStore.put(photo);
  }

  await transaction.objectStore("meta").put({
    key: MIGRATION_META_KEY,
    value: true,
  });

  await transaction.done;

  /*
   * Удаляем старые данные только после полностью успешной
   * IndexedDB-транзакции.
   */
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
