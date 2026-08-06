import type { ExternalTaxonReference } from "../../shared/types/taxonomy";

export type PlantLocation = "home" | "outdoor";

export interface PlantNote {
  id: string;
  createdAt: string;
  content: string;
}

export interface PlantReminder {
  id: string;
  title: string;
  date: string;
  done: boolean;
}

export interface PlantDisplay {
  name: string;
  latinName: string;
  emoji: string;
  needsMisting: boolean;
  tags: string[];
}

/**
 * Основная доменная модель растения.
 *
 * Важно:
 * - фотография не хранится внутри объекта растения;
 * - photoId содержит только идентификатор записи из IndexedDB;
 * - Blob фотографии хранится отдельно в object store "photos".
 */
export interface UserPlant {
  id: string;
  catalogId: string | null;

  customName?: string;
  customLatinName?: string;
  customDescription?: string;
  customEmoji?: string;

  nickname: string;

  /**
   * Идентификатор фотографии в IndexedDB.
   * Здесь никогда не должно быть Data URL, Base64 или blob: URL.
   */
  photo: string | null;

  wateringInterval: number;
  wateringHistory: string[];

  mistingHistory: string[];

  fertilizingInterval: number;
  fertilizingHistory: string[];

  addedAt: string;
  location: PlantLocation;

  notes: PlantNote[];
  reminders: PlantReminder[];

  externalTaxon?: ExternalTaxonReference;
}

/**
 * Отдельная запись фотографии в IndexedDB.
 */
export interface PlantPhoto {
  id: string;
  plantId: string;

  /**
   * Бинарные данные изображения.
   */
  blob: Blob;

  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
}