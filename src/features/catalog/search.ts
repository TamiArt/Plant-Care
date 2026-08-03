import type { CatalogPlant } from "./types";

export function filterCatalog(
  plants: CatalogPlant[],
  query: string,
  activeTag: string | null,
): CatalogPlant[] {
  const normalizedQuery = query.toLocaleLowerCase("ru-RU").trim();

  return plants.filter(plant => {
    if (activeTag !== null && !plant.tags.includes(activeTag)) return false;
    if (!normalizedQuery) return true;

    return plant.name.toLocaleLowerCase("ru-RU").includes(normalizedQuery)
      || plant.latinName.toLocaleLowerCase("ru-RU").includes(normalizedQuery)
      || plant.tags.some(tag => tag.toLocaleLowerCase("ru-RU").includes(normalizedQuery));
  });
}
