export interface SupplementalLightSchedule {
  start: string;
  end: string;
}

export interface SyncPlant {
  id: string;
  catalogId: string | null;
  customName?: string;
  customLatinName?: string;
  customDescription?: string;
  customEmoji?: string;
  nickname: string;
  photoId: string | null;
  photoIds: string[];
  wateringInterval: number;
  wateringHistory: string[];
  mistingEnabled: boolean;
  mistingHistory: string[];
  fertilizingInterval: number;
  fertilizingHistory: string[];
  supplementalLight: SupplementalLightSchedule | null;
  addedAt: string;
  location: "home" | "outdoor";
  notes: unknown[];
  reminders: unknown[];
  externalTaxon?: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface PlantRow {
  id: string;
  catalog_id: string | null;
  custom_name: string | null;
  custom_latin_name: string | null;
  custom_description: string | null;
  custom_emoji: string | null;
  nickname: string;
  photo_id: string | null;
  photo_ids: string;
  watering_interval: number;
  watering_history: string;
  misting_enabled: number;
  misting_history: string;
  fertilizing_interval: number;
  fertilizing_history: string;
  supplemental_light: string | null;
  added_at: string;
  location: string;
  notes: string;
  reminders: string;
  external_taxon: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function arrays(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLight(value: unknown): SupplementalLightSchedule | null {
  if (!isRecord(value) || !isTime(value.start) || !isTime(value.end) || value.start === value.end) return null;
  return { start: value.start, end: value.end };
}

export function normalizeSyncPlant(value: unknown): SyncPlant {
  if (!isRecord(value)) throw new Error("Некорректная запись растения.");
  if (typeof value.id !== "string" || !value.id) throw new Error("У растения отсутствует id.");
  if (typeof value.nickname !== "string") throw new Error(`У растения ${value.id} отсутствует nickname.`);
  if (!isDate(value.createdAt)) throw new Error(`У растения ${value.id} отсутствует корректный createdAt.`);
  if (!isDate(value.updatedAt)) throw new Error(`У растения ${value.id} отсутствует корректный updatedAt.`);
  if (value.deletedAt !== null && value.deletedAt !== undefined && !isDate(value.deletedAt)) {
    throw new Error(`У растения ${value.id} некорректный deletedAt.`);
  }

  const photoIds = strings(value.photoIds).slice(-3);
  const photoId = nullableString(value.photoId);

  return {
    id: value.id,
    catalogId: nullableString(value.catalogId),
    customName: optionalString(value.customName),
    customLatinName: optionalString(value.customLatinName),
    customDescription: optionalString(value.customDescription),
    customEmoji: optionalString(value.customEmoji),
    nickname: value.nickname,
    photoId,
    photoIds: photoIds.length ? photoIds : photoId ? [photoId] : [],
    wateringInterval: numberOr(value.wateringInterval, 7),
    wateringHistory: strings(value.wateringHistory),
    mistingEnabled: value.mistingEnabled !== false,
    mistingHistory: strings(value.mistingHistory),
    fertilizingInterval: numberOr(value.fertilizingInterval, 30),
    fertilizingHistory: strings(value.fertilizingHistory),
    supplementalLight: normalizeLight(value.supplementalLight),
    addedAt: typeof value.addedAt === "string" ? value.addedAt : value.createdAt.slice(0, 10),
    location: value.location === "outdoor" ? "outdoor" : "home",
    notes: arrays(value.notes),
    reminders: arrays(value.reminders),
    externalTaxon: isRecord(value.externalTaxon) ? value.externalTaxon : undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    deletedAt: typeof value.deletedAt === "string" ? value.deletedAt : null,
  };
}

function jsonArray(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stringArray(value: string): string[] {
  return jsonArray(value).filter((item): item is string => typeof item === "string");
}

function jsonObject(value: string | null): unknown | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function storedLight(value: string | null): SupplementalLightSchedule | null {
  if (!value) return null;
  try {
    return normalizeLight(JSON.parse(value));
  } catch {
    return null;
  }
}

function rowToPlant(row: PlantRow): SyncPlant {
  return {
    id: row.id,
    catalogId: row.catalog_id,
    customName: row.custom_name ?? undefined,
    customLatinName: row.custom_latin_name ?? undefined,
    customDescription: row.custom_description ?? undefined,
    customEmoji: row.custom_emoji ?? undefined,
    nickname: row.nickname,
    photoId: row.photo_id,
    photoIds: stringArray(row.photo_ids).slice(-3),
    wateringInterval: row.watering_interval,
    wateringHistory: stringArray(row.watering_history),
    mistingEnabled: row.misting_enabled !== 0,
    mistingHistory: stringArray(row.misting_history),
    fertilizingInterval: row.fertilizing_interval,
    fertilizingHistory: stringArray(row.fertilizing_history),
    supplementalLight: storedLight(row.supplemental_light),
    addedAt: row.added_at,
    location: row.location === "outdoor" ? "outdoor" : "home",
    notes: jsonArray(row.notes),
    reminders: jsonArray(row.reminders),
    externalTaxon: jsonObject(row.external_taxon),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function createPlantUpsert(db: D1Database, userId: string, plant: SyncPlant): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO plants (
      id, user_id, catalog_id, custom_name, custom_latin_name,
      custom_description, custom_emoji, nickname, photo_id, photo_ids,
      watering_interval, watering_history, misting_enabled, misting_history,
      fertilizing_interval, fertilizing_history, supplemental_light,
      added_at, location, notes, reminders, external_taxon,
      created_at, updated_at, deleted_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      catalog_id = excluded.catalog_id,
      custom_name = excluded.custom_name,
      custom_latin_name = excluded.custom_latin_name,
      custom_description = excluded.custom_description,
      custom_emoji = excluded.custom_emoji,
      nickname = excluded.nickname,
      photo_id = excluded.photo_id,
      photo_ids = excluded.photo_ids,
      watering_interval = excluded.watering_interval,
      watering_history = excluded.watering_history,
      misting_enabled = excluded.misting_enabled,
      misting_history = excluded.misting_history,
      fertilizing_interval = excluded.fertilizing_interval,
      fertilizing_history = excluded.fertilizing_history,
      supplemental_light = excluded.supplemental_light,
      added_at = excluded.added_at,
      location = excluded.location,
      notes = excluded.notes,
      reminders = excluded.reminders,
      external_taxon = excluded.external_taxon,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
    WHERE plants.user_id = excluded.user_id
      AND excluded.updated_at >= plants.updated_at
  `).bind(
    plant.id, userId, plant.catalogId, plant.customName ?? null,
    plant.customLatinName ?? null, plant.customDescription ?? null,
    plant.customEmoji ?? null, plant.nickname, plant.photoId,
    JSON.stringify(plant.photoIds), plant.wateringInterval,
    JSON.stringify(plant.wateringHistory), plant.mistingEnabled ? 1 : 0,
    JSON.stringify(plant.mistingHistory), plant.fertilizingInterval,
    JSON.stringify(plant.fertilizingHistory),
    plant.supplementalLight ? JSON.stringify(plant.supplementalLight) : null,
    plant.addedAt, plant.location, JSON.stringify(plant.notes),
    JSON.stringify(plant.reminders),
    plant.externalTaxon ? JSON.stringify(plant.externalTaxon) : null,
    plant.createdAt, plant.updatedAt, plant.deletedAt,
  );
}

export async function getPlantsForUser(db: D1Database, userId: string): Promise<SyncPlant[]> {
  const result = await db.prepare(`
    SELECT
      id, catalog_id, custom_name, custom_latin_name,
      custom_description, custom_emoji, nickname, photo_id, photo_ids,
      watering_interval, watering_history, misting_enabled, misting_history,
      fertilizing_interval, fertilizing_history, supplemental_light,
      added_at, location, notes, reminders, external_taxon,
      created_at, updated_at, deleted_at
    FROM plants
    WHERE user_id = ?1
    ORDER BY updated_at ASC
  `).bind(userId).all<PlantRow>();

  return result.results.map(rowToPlant);
}
