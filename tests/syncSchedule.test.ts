import assert from "node:assert/strict";
import test from "node:test";

import {
  DAILY_SYNC_INTERVAL_MS,
  getDailySyncDelay,
  isDailySyncDue,
} from "../src/features/garden/model/syncSchedule.ts";

const NOW = Date.parse(
  "2026-08-17T16:00:00.000Z",
);

test(
  "sync is due when there is no previous sync",
  () => {
    assert.equal(
      isDailySyncDue(null, NOW),
      true,
    );
  },
);

test(
  "sync is not due before 24 hours",
  () => {
    const lastSyncedAt =
      new Date(
        NOW -
          DAILY_SYNC_INTERVAL_MS +
          1,
      ).toISOString();

    assert.equal(
      isDailySyncDue(
        lastSyncedAt,
        NOW,
      ),
      false,
    );
  },
);

test(
  "sync is due after exactly 24 hours",
  () => {
    const lastSyncedAt =
      new Date(
        NOW -
          DAILY_SYNC_INTERVAL_MS,
      ).toISOString();

    assert.equal(
      isDailySyncDue(
        lastSyncedAt,
        NOW,
      ),
      true,
    );
  },
);

test(
  "daily delay returns remaining time",
  () => {
    const lastSyncedAt =
      new Date(
        NOW -
          6 * 60 * 60 * 1000,
      ).toISOString();

    assert.equal(
      getDailySyncDelay(
        lastSyncedAt,
        NOW,
      ),
      18 * 60 * 60 * 1000,
    );
  },
);
