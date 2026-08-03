import type { PlantLocation, PlantNote, PlantReminder, UserPlant } from "../types";

export const GARDEN_STORAGE_KEY = "plantcare_v1";

export interface GardenStorageResult {
  plants: UserPlant[];
  error?: "unavailable" | "invalid-data";
}

export interface GardenSaveResult {
  ok: boolean;
  error?: "unavailable" | "quota-exceeded";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function migrateNotes(value: unknown): PlantNote[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap(note =>
    typeof note.id === "string" && typeof note.content === "string"
      ? [{ id: note.id, content: note.content, createdAt: typeof note.createdAt === "string" ? note.createdAt : "" }]
      : []
  );
}

function migrateReminders(value: unknown): PlantReminder[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap(reminder =>
    typeof reminder.id === "string" && typeof reminder.title === "string" && typeof reminder.date === "string"
      ? [{ id: reminder.id, title: reminder.title, date: reminder.date, done: reminder.done === true }]
      : []
  );
}

export function migrateStoredPlant(value: unknown): UserPlant | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.nickname !== "string") return null;

  const location: PlantLocation = value.location === "outdoor" ? "outdoor" : "home";
  return {
    ...value,
    id: value.id,
    catalogId: typeof value.catalogId === "string" ? value.catalogId : null,
    nickname: value.nickname,
    photo: typeof value.photo === "string" ? value.photo : null,
    wateringInterval: typeof value.wateringInterval === "number" ? value.wateringInterval : 7,
    wateringHistory: stringArray(value.wateringHistory),
    mistingHistory: stringArray(value.mistingHistory),
    fertilizingInterval: typeof value.fertilizingInterval === "number" ? value.fertilizingInterval : 30,
    fertilizingHistory: stringArray(value.fertilizingHistory),
    notes: migrateNotes(value.notes),
    reminders: migrateReminders(value.reminders),
    addedAt: typeof value.addedAt === "string" ? value.addedAt : "",
    location,
  } as UserPlant;
}

function browserStorage(): Storage | null {
  return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
}

export function loadGarden(storage: Storage | null = browserStorage()): GardenStorageResult {
  if (!storage) return { plants: [], error: "unavailable" };

  try {
    const raw = storage.getItem(GARDEN_STORAGE_KEY);
    if (!raw) return { plants: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { plants: [], error: "invalid-data" };

    const plants = parsed.map(migrateStoredPlant).filter((plant): plant is UserPlant => plant !== null);
    return plants.length === parsed.length
      ? { plants }
      : { plants, error: "invalid-data" };
  } catch {
    return { plants: [], error: "invalid-data" };
  }
}

export function saveGarden(plants: UserPlant[], storage: Storage | null = browserStorage()): GardenSaveResult {
  if (!storage) return { ok: false, error: "unavailable" };

  try {
    storage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(plants));
    return { ok: true };
  } catch {
    return { ok: false, error: "quota-exceeded" };
  }
}
