import assert from "node:assert/strict";
import test from "node:test";
import {
  savePhoto,
} from "../worker/photos/photoRepository.ts";

function createEnv(
  rows: Array<Record<string, unknown> | null>,
) {
  const statements: string[] = [];
  const bound: unknown[][] = [];
  let writeCount = 0;

  const DB = {
    prepare(sql: string) {
      statements.push(sql);
      return {
        bind(...values: unknown[]) {
          bound.push(values);
          return this;
        },
        async first() {
          return rows.shift() ?? null;
        },
        async run() {
          writeCount += 1;
          return { meta: { changes: 0 } };
        },
      };
    },
  };

  return {
    env: { DB } as never,
    statements,
    bound,
    get writeCount() {
      return writeCount;
    },
  };
}

const input = {
  id: "photo-1",
  userId: "user-1",
  plantId: "plant-1",
  data: new Uint8Array([1, 2, 3]).buffer,
  mimeType: "image/webp",
  width: 100,
  height: 100,
  updatedAt: "2026-10-21T10:00:00.000Z",
};

test("savePhoto refuses to reassign an existing photo to another plant", async () => {
  const mock = createEnv([{
    id: "photo-1",
    user_id: "user-1",
    plant_id: "plant-original",
    mime_type: "image/webp",
    width: 100,
    height: 100,
    byte_size: 3,
    created_at: "2026-10-20T10:00:00.000Z",
    updated_at: "2026-10-20T10:00:00.000Z",
    deleted_at: null,
  }]);

  assert.equal(
    await savePhoto(mock.env, input),
    "conflict",
  );
  assert.equal(mock.writeCount, 0);
});

test("savePhoto rejects a photo ID that belongs to another user", async () => {
  const mock = createEnv([{
    id: "photo-1",
    user_id: "another-user",
    plant_id: "private-plant",
    mime_type: "image/webp",
    width: 100,
    height: 100,
    byte_size: 3,
    created_at: "2026-10-20T10:00:00.000Z",
    updated_at: "2026-10-20T10:00:00.000Z",
    deleted_at: null,
  }]);

  assert.equal(
    await savePhoto(mock.env, input),
    "conflict",
  );
  assert.equal(mock.writeCount, 0);
});

test("savePhoto detects an ownership race after the database write", async () => {
  const mock = createEnv([
    null,
    {
      id: "photo-1",
      user_id: "user-1",
      plant_id: "plant-raced",
      mime_type: "image/webp",
      width: 100,
      height: 100,
      byte_size: 3,
      created_at: "2026-10-21T10:00:00.000Z",
      updated_at: "2026-10-21T10:00:00.000Z",
      deleted_at: null,
    },
  ]);

  assert.equal(
    await savePhoto(mock.env, input),
    "conflict",
  );
  assert.equal(mock.writeCount, 1);

  const insertSql = mock.statements.find((sql) =>
    sql.includes("INSERT INTO plant_photos"),
  );
  assert.ok(insertSql);
  assert.match(insertSql, /plant_photos\.plant_id\s*=\s*excluded\.plant_id/);
});
