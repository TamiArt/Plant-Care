import assert from "node:assert/strict";
import test from "node:test";

import {
  filterAndSortPlants,
  matchesPlantSearch,
} from "../src/features/garden/model/plantList.ts";
import type {
  PlantDisplay,
  UserPlant,
} from "../src/features/garden/types.ts";

function item(
  id: string,
  russianName: string,
  nickname: string,
  wateringHistory: string[],
  wateringInterval = 7,
) {
  const plant = {
    id,
    nickname,
    wateringInterval,
    wateringHistory,
  } as UserPlant;

  const display: PlantDisplay = {
    name: russianName,
    latinName: `${russianName} latin`,
    emoji: "🌿",
    needsMisting: false,
    tags: [],
  };

  return { plant, display };
}

test(
  "searches by Russian name, nickname and Latin name",
  () => {
    const monstera = item(
      "1",
      "Монстера",
      "Маша",
      [],
    );

    assert.equal(
      matchesPlantSearch(
        monstera,
        "монс",
      ),
      true,
    );
    assert.equal(
      matchesPlantSearch(
        monstera,
        "маша",
      ),
      true,
    );
    assert.equal(
      matchesPlantSearch(
        monstera,
        "latin",
      ),
      true,
    );
  },
);

test(
  "sorts Russian names alphabetically",
  () => {
    const result =
      filterAndSortPlants(
        [
          item("1", "Фикус", "A", []),
          item("2", "Азалия", "B", []),
          item("3", "Монстера", "C", []),
        ],
        "",
        "name",
      );

    assert.deepEqual(
      result.map(
        value => value.display.name,
      ),
      [
        "Азалия",
        "Монстера",
        "Фикус",
      ],
    );
  },
);

test(
  "watering sort puts plants needing water first",
  () => {
    const today =
      new Date()
        .toISOString()
        .slice(0, 10);
    const oldDate = "2020-01-01";

    const result =
      filterAndSortPlants(
        [
          item(
            "fresh",
            "Фикус",
            "Свежий",
            [today],
          ),
          item(
            "overdue",
            "Азалия",
            "Сухой",
            [oldDate],
          ),
          item(
            "never",
            "Монстера",
            "Без полива",
            [],
          ),
        ],
        "",
        "watering",
      );

    assert.equal(
      result.at(-1)?.plant.id,
      "fresh",
    );

    assert.notEqual(
      result[0]?.plant.id,
      "fresh",
    );
  },
);
