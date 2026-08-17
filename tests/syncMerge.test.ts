import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeCareHistoryPlant,
} from "../worker/syncMerge.ts";

function plant(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "plant-1",
    nickname: "Монстера",
    updatedAt: "2026-08-17T10:00:00.000Z",
    wateringHistory: ["2026-08-01"],
    mistingHistory: [],
    fertilizingHistory: [],
    ...overrides,
  };
}

test(
  "keeps local watering when remote metadata is newer",
  () => {
    const remote = plant({
      nickname: "remote",
      updatedAt: "2026-08-17T12:00:00.000Z",
    });
    const incoming = plant({
      nickname: "local",
      updatedAt: "2026-08-17T11:00:00.000Z",
      wateringHistory: [
        "2026-08-01",
        "2026-08-17",
      ],
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T12:01:00.000Z",
    );

    assert.equal(result.nickname, "remote");
    assert.deepEqual(
      result.wateringHistory,
      ["2026-08-01", "2026-08-17"],
    );
  },
);

test(
  "survives future remote timestamp",
  () => {
    const remote = plant({
      updatedAt: "2026-08-18T09:00:00.000Z",
    });
    const incoming = plant({
      updatedAt: "2026-08-17T11:00:00.000Z",
      wateringHistory: [
        "2026-08-01",
        "2026-08-17",
      ],
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T12:01:00.000Z",
    );

    assert.deepEqual(
      result.wateringHistory,
      ["2026-08-01", "2026-08-17"],
    );
    assert.ok(
      result.updatedAt >= remote.updatedAt,
    );
  },
);

test(
  "keeps newer metadata and remote history",
  () => {
    const remote = plant({
      mistingHistory: ["2026-08-15"],
    });
    const incoming = plant({
      nickname: "Новое имя",
      updatedAt: "2026-08-17T13:00:00.000Z",
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T13:01:00.000Z",
    );

    assert.equal(result.nickname, "Новое имя");
    assert.deepEqual(
      result.mistingHistory,
      ["2026-08-15"],
    );
  },
);

test(
  "deduplicates and sorts history",
  () => {
    const remote = plant({
      wateringHistory: [
        "2026-08-10",
        "2026-08-01",
      ],
    });
    const incoming = plant({
      wateringHistory: [
        "2026-08-10",
        "2026-08-17",
      ],
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T14:00:00.000Z",
    );

    assert.deepEqual(
      result.wateringHistory,
      [
        "2026-08-01",
        "2026-08-10",
        "2026-08-17",
      ],
    );
  },
);
