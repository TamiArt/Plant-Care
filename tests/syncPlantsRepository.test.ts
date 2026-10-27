import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlantUpsert,
  type SyncPlant,
} from "../worker/syncPlantsRepository.ts";

test("plant UPSERT cannot clear an existing deletion tombstone", () => {
  let query = "";
  const statement = {
    bind() {
      return this;
    },
  };

  const db = {
    prepare(sql: string) {
      query = sql;
      return statement;
    },
  } as unknown as D1Database;

  const plant: SyncPlant = {
    id: "plant-1",
    catalogId: null,
    nickname: "Монстера",
    photoId: null,
    photoIds: [],
    deletedPhotoIds: [],
    wateringInterval: 7,
    wateringHistory: [],
    mistingEnabled: true,
    mistingHistory: [],
    fertilizingInterval: 30,
    fertilizingHistory: [],
    supplementalLight: null,
    addedAt: "2026-08-01",
    location: "home",
    notes: [],
    reminders: [],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-10-27T10:00:00.000Z",
    deletedAt: null,
  };

  createPlantUpsert(db, "user-1", plant);

  assert.match(
    query,
    /deleted_at\s*=\s*CASE\s+WHEN plants\.deleted_at IS NOT NULL THEN plants\.deleted_at\s+ELSE excluded\.deleted_at\s+END/s,
  );

  // Preserve row ownership and last-write-wins guards in the same UPSERT.
  assert.match(
    query,
    /WHERE plants\\.user_id = excluded\\.user_id\\s+AND excluded\\.updated_at >= plants\\.updated_at/s,
  );
});
