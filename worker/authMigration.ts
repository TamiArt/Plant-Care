import {
  getMigrations,
} from "better-auth/db/migration";

import {
  createAuth,
  type AuthEnv,
} from "./auth";

export async function runAuthMigrations(
  env: AuthEnv,
): Promise<{
  created: string[];
  added: string[];
}> {
  const auth = createAuth(env);

  const {
    toBeCreated,
    toBeAdded,
    runMigrations,
  } = await getMigrations(auth.options);

  await runMigrations();

  const created = toBeCreated.map(
    table => table.table,
  );

  const added = toBeAdded.flatMap(
    table =>
      Object.keys(table.fields).map(
        fieldName =>
          `${table.table}.${fieldName}`,
      ),
  );

  return {
    created,
    added,
  };
}