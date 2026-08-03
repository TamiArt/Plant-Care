export interface CatalogPlant {
  id: string;
  name: string;
  latinName: string;
  emoji: string;
  unsplashId: string;
  difficulty: "easy" | "medium" | "hard";
  watering: { summer: number; winter: number };
  tropical: boolean;
  needsMisting: boolean;
  description: string;
  careTip: string;
  diseases: string[];
  seasonalTips: string[];
  tags: string[];
  source?: "local" | "gbif";
  gbifKey?: number;
  gbifRank?: string;
  gbifStatus?: string;
}

export type { ExternalTaxonReference };
import type { ExternalTaxonReference } from "../../shared/types/taxonomy";
