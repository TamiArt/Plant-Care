import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  hasAllCareHistory,
  hasAllPhotoTombstones,
  mergeCareHistoryPlant,
} from "../worker/syncMerge.ts";
import {
  createPlantUpsert,
  getPlantsForUser,
  type SyncPlant,
} from "../worker/syncPlantsRepository.ts";

class SqliteStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  all<T>() {
    const statement = this.database.prepare(this.sql);
    return { results: statement.all(...this.values) as T[] };
  }

  first<T>() {
    const statement = this.database.prepare(this.sql);
    return statement.get(...this.values) as T | null;
  }

  run() {
    const statement = this.database.prepare(this.sql);
    return statement.run(...this.values);
  }
}

class SqliteD1Adapter {
  constructor(readonly database: DatabaseSync) {}

  prepare(sql: string) {
    return new SqliteStatement(this.database, sql);
  }

  batch(statements: SqliteStatement[]) {
    this.database.exec("BEGIN");
    try {
      const results = statements.map(statement => statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function plant(overrides: Partial<SyncPlant> = {}): SyncPlant {
  return {
    id: "plant-1",
    catalogId: null,
    nickname: "Monstera",
    photoId: "photo-live",
    photoIds: ["photo-live"],
    deletedPhotoIds: [],
    wateringInterval: 7,
    wateringHistory: ["2026-10-01"],
    mistingEnabled: true,
    mistingHistory: [],
    fertilizingInterval: 30,
    fertilizingHistory: [],
    supplementalLight: null,
    addedAt: "2026-10-01",
    location: "home",
    notes: [],
    reminders: [],
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-27T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function applyMigrations(database: DatabaseSync) {
  const migrationsDirectory = join(process.cwd(), "worker", "migrations");
  const migrations = readdirSync(migrationsDirectory)
    .filter(name => name.endsWith(".sql"))
    .sort();

  for (const migration of migrations) {
    database.exec(readFileSync(join(migrationsDirectory, migration), "utf8"));
  }
}

test("SQLite-backed UPSERT and retry preserve concurrent care events and photo tombstones", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    applyMigrations(sqlite);
    const db = new SqliteD1Adapter(sqlite) as unknown as D1Database;
    sqlite.prepare(
      "INSERT INTO app_users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("user-1", "user@example.test", "2026-10-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z");

    const initial = plant();
    db.batch([createPlantUpsert(db, "user-1", initial)]);

    // Both devices read the same version before either write is visible.
    const deviceA = plant({
      wateringHistory: ["2026-10-01", "2026-10-27"],
      photoIds: ["photo-live"],
      deletedPhotoIds: ["photo-deleted-a"],
    });
    const deviceB = plant({
      mistingHistory: ["2026-10-27"],
      photoIds: ["photo-live"],
      deletedPhotoIds: ["photo-deleted-b"],
    });
    const initialRows = await getPlantsForUser(db, "user-1");
    const sharedSnapshot = initialRows[0];
      const candidateA = mergeCareHistoryPlant(sharedSnapshot, deviceA, "2026-10-27T10:01:00.000Z");
      const candidateB = mergeCareHistoryPlant(sharedSnapshot, deviceB, "2026-10-27T10:02:00.000Z");

      db.batch([createPlantUpsert(db, "user-1", candidateA)]);
      db.batch([createPlantUpsert(db, "user-1", candidateB)]);

      // Equal timestamps allow the second SQL UPSERT to expose the lost-update
      // window. The production handler must detect it and re-read/merge.
      let persisted = (await getPlantsForUser(db, "user-1"))[0];
      assert.equal(hasAllCareHistory(persisted, candidateA), false);
      assert.equal(hasAllPhotoTombstones(persisted, candidateA), false);

      const retryCandidate = mergeCareHistoryPlant(persisted, deviceA, "2026-10-27T10:03:00.000Z");
      db.batch([createPlantUpsert(db, "user-1", retryCandidate)]);
      persisted = (await getPlantsForUser(db, "user-1"))[0];

      assert.deepEqual(persisted.wateringHistory, ["2026-10-01", "2026-10-27"]);
      assert.deepEqual(persisted.mistingHistory, ["2026-10-27"]);
      assert.deepEqual(persisted.deletedPhotoIds, ["photo-deleted-a", "photo-deleted-b"]);
      assert.equal(hasAllCareHistory(persisted, deviceA), true);
      assert.equal(hasAllCareHistory(persisted, deviceB), true);
      assert.equal(hasAllPhotoTombstones(persisted, deviceA), true);
    assert.equal(hasAllPhotoTombstones(persisted, deviceB), true);
  } finally {
    sqlite.close();
  }
});

test("SQLite-backed UPSERT keeps a deletion tombstone against a future-dated stale active snapshot", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    applyMigrations(sqlite);
    const db = new SqliteD1Adapter(sqlite) as unknown as D1Database;
    sqlite.prepare(
      "INSERT INTO app_users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("user-1", "user@example.test", "2026-10-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z");

    const deleted = plant({
      nickname: "Deleted plant",
      updatedAt: "2026-10-27T10:00:00.000Z",
      deletedAt: "2026-10-27T10:00:00.000Z",
    });
    const staleActive = plant({
      nickname: "Stale active plant",
      updatedAt: "2030-01-01T00:00:00.000Z",
      deletedAt: null,
    });

    db.batch([createPlantUpsert(db, "user-1", deleted)]);
    db.batch([createPlantUpsert(db, "user-1", staleActive)]);

    const persisted = (await getPlantsForUser(db, "user-1"))[0];
    assert.equal(persisted.deletedAt, deleted.deletedAt);
    assert.equal(persisted.nickname, staleActive.nickname);
  } finally {
    sqlite.close();
  }
});

test("SQLite migrations support photo deletion tombstones in the photo table", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    applyMigrations(sqlite);
    const columns = sqlite.prepare("PRAGMA table_info(plant_photos)").all() as Array<{ name: string }>;
    assert.ok(columns.some(column => column.name === "deleted_at"));

    const db = new SqliteD1Adapter(sqlite) as unknown as D1Database;
    sqlite.prepare(
      "INSERT INTO app_users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run("user-1", "user@example.test", "2026-10-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z");

    const active = plant();
    db.batch([createPlantUpsert(db, "user-1", active)]);
    sqlite.prepare(`
      INSERT INTO plant_photos (
        id, user_id, plant_id, photo_blob, mime_type, width, height,
        byte_size, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(
      "photo-live", "user-1", "plant-1", new Uint8Array([1]),
      "image/webp", 1, 1, 1, active.updatedAt, active.updatedAt,
    );

    const removed = plant({
      photoId: null,
      photoIds: [],
      deletedPhotoIds: ["photo-live"],
      updatedAt: "2026-10-27T10:01:00.000Z",
    });
    db.batch([createPlantUpsert(db, "user-1", removed)]);

    const photo = sqlite.prepare(
      "SELECT deleted_at FROM plant_photos WHERE id = ?",
    ).get("photo-live") as { deleted_at: string | null };
    assert.equal(photo.deleted_at, removed.updatedAt);
  } finally {
    sqlite.close();
  }
});
