import assert from "node:assert/strict";
import test from "node:test";

import {
  reconcilePlantSync,
} from "../src/features/garden/sync/reconcilePlants.ts";

import type {
  UserPlant,
} from "../src/features/garden/types.ts";

function plant(
  overrides: Partial<UserPlant> = {},
): UserPlant {
  return {
    id: "plant-1",
    catalogId: "monstera",
    nickname: "Монстера",
    photoId: null,
    photoIds: [],
    wateringInterval: 7,
    wateringHistory: [],
    mistingHistory: [],
    fertilizingInterval: 30,
    fertilizingHistory: [],
    addedAt: "2026-08-01",
    location: "home",
    notes: [],
    reminders: [],
    createdAt:
      "2026-08-01T10:00:00.000Z",
    updatedAt:
      "2026-08-17T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

test(
  "does not overwrite watering added while sync was in flight",
  () => {
    const sent = plant({
      wateringHistory: [],
      updatedAt:
        "2026-08-17T10:00:00.000Z",
    });

    const latest = plant({
      wateringHistory: [
        "2026-08-17",
      ],
      updatedAt:
        "2026-08-17T10:00:02.000Z",
    });

    const remote = plant({
      wateringHistory: [],
      updatedAt:
        "2026-08-17T10:00:01.000Z",
    });

    const [result] =
      reconcilePlantSync(
        [sent],
        [latest],
        [remote],
      );

    assert.deepEqual(
      result.wateringHistory,
      ["2026-08-17"],
    );

    assert.ok(
      result.updatedAt >=
        latest.updatedAt,
    );
  },
);

test(
  "keeps a local in-flight change even when remote clock is ahead",
  () => {
    const sent = plant({
      nickname: "Старое имя",
      updatedAt:
        "2026-08-17T10:00:00.000Z",
    });

    const latest = plant({
      nickname: "Локальное имя",
      wateringHistory: [
        "2026-08-17",
      ],
      updatedAt:
        "2026-08-17T10:00:02.000Z",
    });

    const remote = plant({
      nickname: "Старое имя",
      updatedAt:
        "2026-08-18T10:00:00.000Z",
    });

    const [result] =
      reconcilePlantSync(
        [sent],
        [latest],
        [remote],
      );

    assert.equal(
      result.nickname,
      "Локальное имя",
    );

    assert.deepEqual(
      result.wateringHistory,
      ["2026-08-17"],
    );

    assert.ok(
      result.updatedAt >
        remote.updatedAt,
    );
  },
);

test(
  "accepts a newer remote plant when local record did not change during sync",
  () => {
    const sent = plant({
      nickname: "До sync",
    });

    const latest = {
      ...sent,
    };

    const remote = plant({
      nickname: "С другого устройства",
      updatedAt:
        "2026-08-17T11:00:00.000Z",
    });

    const [result] =
      reconcilePlantSync(
        [sent],
        [latest],
        [remote],
      );

    assert.equal(
      result.nickname,
      "С другого устройства",
    );
  },
);

test(
  "merges care events from both devices without duplicates",
  () => {
    const sent = plant({
      wateringHistory: [
        "2026-08-01",
      ],
    });

    const latest = {
      ...sent,
    };

    const remote = plant({
      wateringHistory: [
        "2026-08-01",
        "2026-08-10",
      ],
      mistingHistory: [
        "2026-08-12",
      ],
      updatedAt:
        "2026-08-17T11:00:00.000Z",
    });

    const [result] =
      reconcilePlantSync(
        [sent],
        [latest],
        [remote],
      );

    assert.deepEqual(
      result.wateringHistory,
      [
        "2026-08-01",
        "2026-08-10",
      ],
    );

    assert.deepEqual(
      result.mistingHistory,
      ["2026-08-12"],
    );
  },
);
