import type {
  PlantDisplay,
  UserPlant,
} from "../types";
import {
  getWateringStatus,
} from "./watering";

export type PlantSortMode =
  | "watering"
  | "name";

export interface PlantListItem {
  plant: UserPlant;
  display: PlantDisplay;
}

const russianCollator =
  new Intl.Collator("ru", {
    sensitivity: "base",
    numeric: true,
  });

function normalizeSearch(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU");
}

export function matchesPlantSearch(
  item: PlantListItem,
  query: string,
): boolean {
  const normalized =
    normalizeSearch(query);

  if (!normalized) {
    return true;
  }

  return [
    item.display.name,
    item.plant.nickname,
    item.display.latinName,
  ].some(value =>
    normalizeSearch(value)
      .includes(normalized),
  );
}

export function comparePlantsByName(
  first: PlantListItem,
  second: PlantListItem,
): number {
  const byRussianName =
    russianCollator.compare(
      first.display.name,
      second.display.name,
    );

  if (byRussianName !== 0) {
    return byRussianName;
  }

  return russianCollator.compare(
    first.plant.nickname,
    second.plant.nickname,
  );
}

export function comparePlantsByWatering(
  first: PlantListItem,
  second: PlantListItem,
): number {
  const firstStatus =
    getWateringStatus(first.plant);
  const secondStatus =
    getWateringStatus(second.plant);

  const byUrgency =
    secondStatus.urgency -
    firstStatus.urgency;

  if (byUrgency !== 0) {
    return byUrgency;
  }

  return comparePlantsByName(
    first,
    second,
  );
}

export function filterAndSortPlants(
  items: PlantListItem[],
  query: string,
  sortMode: PlantSortMode,
): PlantListItem[] {
  const filtered =
    items.filter(item =>
      matchesPlantSearch(
        item,
        query,
      ),
    );

  return [...filtered].sort(
    sortMode === "name"
      ? comparePlantsByName
      : comparePlantsByWatering,
  );
}
