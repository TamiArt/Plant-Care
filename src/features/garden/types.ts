import type { ExternalTaxonReference } from "../catalog/types";

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
