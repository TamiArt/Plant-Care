import type {
  ExternalTaxonReference,
} from "../../shared/types/taxonomy";

export type PlantLocation =
  | "home"
  | "outdoor";

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
   * Только идентификатор фотографии.
   *
   * Blob хранится отдельно в IndexedDB.
   * Base64/Data URL здесь быть не должно.
   */
  photoId: string | null;

  /** Фото в порядке добавления; последнее используется как обложка. */
  photoIds?: string[];

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

  /**
   * Дата создания записи.
   *
   * UTC ISO string.
   */
  createdAt: string;

  /**
   * Время последнего изменения.
   *
   * Используется для Last Write Wins.
   */
  updatedAt: string;

  /**
   * Soft delete / tombstone.
   *
   * null — растение существует.
   * string — растение удалено.
   */
  deletedAt: string | null;
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
