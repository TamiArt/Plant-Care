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

test(
  "keeps the complete photo gallery during cloud merge",
  () => {
    const remote = plant({
      photoId: "photo-1",
      photoIds: ["photo-1"],
    });
    const incoming = plant({
      photoId: "photo-1",
      photoIds: ["photo-1", "photo-2", "photo-3"],
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T14:00:00.000Z",
    );

    assert.deepEqual(
      result.photoIds,
      ["photo-1", "photo-2", "photo-3"],
    );
    assert.equal(
      result.photoId,
      "photo-1",
    );
  },
);

test(
  "keeps remote-only photos when the local device has an older gallery",
  () => {
    const remote = plant({
      updatedAt: "2026-08-17T14:00:00.000Z",
      photoId: "photo-1",
      photoIds: ["photo-1", "photo-2", "photo-3"],
    });
    const incoming = plant({
      updatedAt: "2026-08-17T15:00:00.000Z",
      photoId: "photo-1",
      photoIds: ["photo-1"],
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T15:01:00.000Z",
    );

    assert.deepEqual(
      result.photoIds,
      ["photo-1", "photo-2", "photo-3"],
    );
  },
);

test(
  "keeps local-only photos when the remote device has an older gallery",
  () => {
    const remote = plant({
      updatedAt: "2026-08-17T15:00:00.000Z",
      photoId: "photo-1",
      photoIds: ["photo-1"],
    });
    const incoming = plant({
      updatedAt: "2026-08-17T14:00:00.000Z",
      photoId: "photo-1",
      photoIds: ["photo-1", "photo-2", "photo-3"],
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T15:01:00.000Z",
    );

    assert.deepEqual(
      result.photoIds,
      ["photo-1", "photo-2", "photo-3"],
    );
  },
);

test(
  "keeps a manually selected primary photo during cloud merge",
  () => {
    const remote = plant({
      photoId: "photo-1",
      photoIds: ["photo-1", "photo-2", "photo-3"],
    });
    const incoming = plant({
      photoId: "photo-3",
      photoIds: ["photo-1", "photo-2", "photo-3"],
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T14:00:00.000Z",
    );

    assert.deepEqual(
      result.photoIds,
      ["photo-1", "photo-2", "photo-3"],
    );
    assert.equal(
      result.photoId,
      "photo-3",
    );
  },
);

test(
  "uses the first gallery photo as default primary",
  () => {
    const remote = plant({
      photoIds: ["photo-1", "photo-2"],
      photoId: null,
    });
    const incoming = plant({
      photoIds: ["photo-1", "photo-2", "photo-3"],
      photoId: null,
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-17T14:00:00.000Z",
    );

    assert.equal(
      result.photoId,
      "photo-1",
    );
  },
);

test(
  "keeps every photo when a primary photo is missing from photoIds",
  () => {
    const result = mergeCareHistoryPlant(
      plant({
        photoId: null,
        photoIds: ["photo-1", "photo-2"],
      }),
      plant({
        photoId: "photo-3",
        photoIds: ["photo-1", "photo-2"],
        updatedAt: "2026-08-17T11:00:00.000Z",
      }),
      "2026-08-17T12:00:00.000Z",
    );

    assert.deepEqual(result.photoIds, [
      "photo-3",
      "photo-1",
      "photo-2",
    ]);
    assert.equal(result.photoId, "photo-3");
  },
);

test(
  "does not resurrect a photo intentionally deleted on one device",
  () => {
    const remote = plant({
      photoId: "photo-1",
      photoIds: ["photo-1", "photo-2", "photo-3"],
      deletedPhotoIds: [],
    });
    const incoming = plant({
      photoId: "photo-2",
      photoIds: ["photo-2", "photo-3"],
      deletedPhotoIds: ["photo-1"],
      updatedAt: "2026-08-18T10:00:00.000Z",
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-18T10:01:00.000Z",
    );

    assert.deepEqual(result.photoIds, [
      "photo-2",
      "photo-3",
    ]);
    assert.deepEqual(result.deletedPhotoIds, [
      "photo-1",
    ]);
    assert.equal(result.photoId, "photo-2");
  },
);

test(
  "propagates photo deletion tombstones in both directions",
  () => {
    const remote = plant({
      photoId: "photo-1",
      photoIds: ["photo-1", "photo-2"],
      deletedPhotoIds: ["photo-3"],
    });
    const incoming = plant({
      photoId: "photo-2",
      photoIds: ["photo-2", "photo-3"],
      deletedPhotoIds: ["photo-1"],
    });

    const result = mergeCareHistoryPlant(
      remote,
      incoming,
      "2026-08-18T10:01:00.000Z",
    );

    assert.deepEqual(result.photoIds, [
      "photo-2",
    ]);
    assert.deepEqual(
      result.deletedPhotoIds,
      ["photo-3", "photo-1"],
    );
  },
);
