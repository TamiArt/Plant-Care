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

export interface UserPlant {
  id: string;
  catalogId: string | null;
  customName?: string;
  customLatinName?: string;
  customDescription?: string;
  customEmoji?: string;
  nickname: string;

  /**
   * Только идентификатор Blob-записи в IndexedDB.
   * Data URL, Base64 и blob: URL здесь хранить нельзя.
   */
  photoId: string | null;

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

export interface PlantPhoto {
  id: string;
  plantId: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
}
