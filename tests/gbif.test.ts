import assert from "node:assert/strict";
import test from "node:test";
import { gbifResultToCatalogPlant, toExternalTaxon } from "../src/features/catalog/gbif.ts";

test("maps an accepted GBIF plant into a catalog card", () => {
  const plant = gbifResultToCatalogPlant({
    key: 2877951,
    scientificName: "Lavandula angustifolia Mill.",
    canonicalName: "Lavandula angustifolia",
    vernacularName: "Лаванда узколистная",
    kingdom: "Plantae",
    family: "Lamiaceae",
    rank: "SPECIES",
    status: "ACCEPTED",
  });

  assert.equal(plant.id, "gbif-2877951");
  assert.equal(plant.name, "Лаванда узколистная");
  assert.equal(plant.latinName, "Lavandula angustifolia");
  assert.equal(plant.source, "gbif");
  assert.equal(plant.gbifRank, "SPECIES");
  assert.equal(plant.gbifStatus, "ACCEPTED");
  assert.ok(plant.tags.includes("принятое название"));
});

test("preserves the external taxon identity for offline garden records", () => {
  const plant = gbifResultToCatalogPlant({ key: 2877951, canonicalName: "Lavandula angustifolia", kingdom: "Plantae", rank: "SPECIES", status: "ACCEPTED" });
  const reference = toExternalTaxon(plant);

  assert.equal(reference?.provider, "gbif");
  assert.equal(reference?.taxonKey, 2877951);
  assert.equal(reference?.scientificName, "Lavandula angustifolia");
  assert.equal(reference?.rank, "SPECIES");
  assert.equal(reference?.status, "ACCEPTED");
  assert.match(reference?.fetchedAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
});

test("does not create a GBIF reference for editorial plants", () => {
  assert.equal(toExternalTaxon({
    id: "local", name: "Растение", latinName: "Planta", emoji: "🌿", unsplashId: "",
    difficulty: "easy", watering: { summer: 7, winter: 14 }, tropical: false,
    needsMisting: false, description: "", careTip: "", diseases: [], seasonalTips: [], tags: [],
  }), undefined);
});
