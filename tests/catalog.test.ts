import assert from "node:assert/strict";
import test from "node:test";
import { ADDITIONAL_CATALOG } from "../src/features/catalog/additionalData.ts";
import { CORE_CATALOG } from "../src/features/catalog/data.ts";
import { GARDEN_CATALOG } from "../src/features/catalog/gardenData.ts";
import { filterCatalog } from "../src/features/catalog/search.ts";

const catalog = [...CORE_CATALOG, ...ADDITIONAL_CATALOG, ...GARDEN_CATALOG];

test("catalog contains a substantial offline selection with unique ids", () => {
  assert.ok(catalog.length >= 115);
  assert.equal(new Set(catalog.map(plant => plant.id)).size, catalog.length);
});

test("exact catalog search finds requested cultivars", () => {
  assert.equal(filterCatalog(catalog, "вайт фьюжн", null)[0]?.id, "calathea-white-fusion");
  assert.equal(filterCatalog(catalog, "Spathiphyllum 'Picasso'", null)[0]?.id, "spathiphyllum-picasso");
  assert.equal(filterCatalog(catalog, "пикассо", null)[0]?.id, "spathiphyllum-picasso");
});

test("rose filter includes a varied garden selection", () => {
  const roses = filterCatalog(catalog, "", "роза");
  assert.ok(roses.length >= 10);
  assert.ok(roses.some(plant => plant.tags.includes("плетистая")));
  assert.ok(roses.some(plant => plant.tags.includes("флорибунда")));
  assert.ok(roses.some(plant => plant.tags.includes("почвопокровная")));
});

test("new editorial cards deliberately avoid unverified remote photos", () => {
  assert.ok(ADDITIONAL_CATALOG.every(plant => plant.source === "local"));
  assert.ok(ADDITIONAL_CATALOG.every(plant => plant.unsplashId === ""));
});

test("garden catalog covers requested plant groups and cultivars", () => {
  const expectedTags = ["хоста", "пион", "туя", "рододендрон", "гортензия"];
  for (const tag of expectedTags) {
    assert.ok(filterCatalog(catalog, "", tag).length >= 4, `expected at least four entries tagged ${tag}`);
  }

  assert.ok(filterCatalog(catalog, "", "плетистая").length >= 5);
  assert.equal(filterCatalog(catalog, "аннабель", null)[0]?.id, "hydrangea-annabelle");
  assert.equal(filterCatalog(catalog, "брабант", null)[0]?.id, "thuja-brabant");
});
