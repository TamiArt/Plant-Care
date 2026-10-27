import assert from "node:assert/strict";
import test from "node:test";

import {
  syncPlantsWithCloud,
} from "../src/features/garden/sync/syncRepository.ts";

test("retries a retryable concurrent sync conflict", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = (async () => {
    calls += 1;

    if (calls === 1) {
      return Response.json(
        {
          error: "Concurrent sync conflict",
          retryable: true,
        },
        { status: 409 },
      );
    }

    return Response.json({
      plants: [],
      syncedAt: "2026-10-27T10:00:00.000Z",
    });
  }) as typeof fetch;

  try {
    const result = await syncPlantsWithCloud([]);

    assert.equal(calls, 2);
    assert.deepEqual(result.plants, []);
    assert.equal(result.syncedAt, "2026-10-27T10:00:00.000Z");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not retry a non-retryable conflict", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = (async () => {
    calls += 1;
    return Response.json(
      { error: "Conflict" },
      { status: 409 },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      syncPlantsWithCloud([]),
      /Conflict/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
