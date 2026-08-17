import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeSyncedPlant,
} from "../src/features/garden/model/careSyncMerge.ts";

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
  "keeps watering added locally while sync response is in flight",
  () => {
    const local = plant({
      wateringHistory: [
        "2026-08-17",
      ],
      updatedAt:
        "2026-08-17T10:00:02.000Z",
    });

    const staleRemote = plant({
      wateringHistory: [],
      updatedAt:
        "2026-08-17T10:00:01.000Z",
    });

    const result =
      mergeSyncedPlant(
        local,
        staleRemote,
      );

    assert.deepEqual(
      result.wateringHistory,
      ["2026-08-17"],
    );
  },
);

test(
  "keeps watering even when remote timestamp is ahead",
  () => {
    const local = plant({
      wateringHistory: [
        "2026-08-17",
      ],
      updatedAt:
        "2026-08-17T10:00:02.000Z",
    });

    const remote = plant({
      wateringHistory: [],
      updatedAt:
        "2026-08-18T10:00:00.000Z",
    });

    const result =
      mergeSyncedPlant(
        local,
        remote,
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
  "accepts newer remote metadata",
  () => {
    const local = plant({
      nickname: "Локальное имя",
    });

    const remote = plant({
      nickname: "С другого устройства",
      updatedAt:
        "2026-08-17T11:00:00.000Z",
    });

    const result =
      mergeSyncedPlant(
        local,
        remote,
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
    const local = plant({
      wateringHistory: [
        "2026-08-01",
        "2026-08-17",
      ],
    });

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

    const result =
      mergeSyncedPlant(
        local,
        remote,
      );

    assert.deepEqual(
      result.wateringHistory,
      [
        "2026-08-01",
        "2026-08-10",
        "2026-08-17",
      ],
    );

    assert.deepEqual(
      result.mistingHistory,
      ["2026-08-12"],
    );
  },
);
