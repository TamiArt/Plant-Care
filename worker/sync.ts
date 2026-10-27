import {
  createAuth,
  type AuthEnv,
} from "./auth";
import {
  hasAllCareHistory,
  hasAllPhotoTombstones,
  mergeCareHistoryPlant,
} from "./syncMerge";
import {
  createPlantUpsert,
  getPlantsForUser,
  normalizeSyncPlant,
  type SyncPlant,
} from "./syncPlantsRepository";

export interface SyncEnv extends AuthEnv {
  APP_ENV: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
}

interface SyncRequestBody {
  plants?: unknown;
}

function json(
  data: unknown,
  init: ResponseInit = {},
): Response {
  const headers =
    new Headers(init.headers);

  headers.set(
    "Content-Type",
    "application/json; charset=utf-8",
  );

  return new Response(
    JSON.stringify(data),
    {
      ...init,
      headers,
    },
  );
}

async function requireUser(
  request: Request,
  env: SyncEnv,
): Promise<AuthenticatedUser | null> {
  const auth = createAuth(env);
  const session =
    await auth.api.getSession({
      headers: request.headers,
    });

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
  };
}

async function ensureAppUser(
  env: SyncEnv,
  user: AuthenticatedUser,
): Promise<void> {
  const now =
    new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO app_users (
      id,
      email,
      created_at,
      updated_at
    )
    VALUES (?1, ?2, ?3, ?3)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      updated_at = excluded.updated_at
  `).bind(
    user.id,
    user.email,
    now,
  ).run();
}

export async function handleGetPlants(
  request: Request,
  env: SyncEnv,
): Promise<Response> {
  const user =
    await requireUser(
      request,
      env,
    );

  if (!user) {
    return json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  await ensureAppUser(
    env,
    user,
  );

  const plants =
    await getPlantsForUser(
      env.DB,
      user.id,
    );

  return json({
    plants,
    syncedAt:
      new Date().toISOString(),
  });
}

export async function handleSyncPlants(
  request: Request,
  env: SyncEnv,
): Promise<Response> {
  const user =
    await requireUser(
      request,
      env,
    );

  if (!user) {
    return json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: SyncRequestBody;

  try {
    body =
      await request.json<
        SyncRequestBody
      >();
  } catch {
    return json(
      { error: "Некорректный JSON." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.plants)) {
    return json(
      {
        error:
          "Поле plants должно быть массивом.",
      },
      { status: 400 },
    );
  }

  let plants: SyncPlant[];

  try {
    plants =
      body.plants.map(
        normalizeSyncPlant,
      );
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Некорректные данные растений.",
      },
      { status: 400 },
    );
  }

  await ensureAppUser(
    env,
    user,
  );

  /*
   * A concurrent request can update a row after we read it but before the
   * guarded UPSERT runs. In that case SQL correctly protects newer metadata,
   * but it may also reject this request's appended care-history events.
   * Re-read and merge a bounded number of times; never silently report sync
   * success while an incoming care event is still missing from persisted data.
   */
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const remotePlants =
      await getPlantsForUser(
        env.DB,
        user.id,
      );
    const remoteById =
      new Map(
        remotePlants.map(
          plant => [
            plant.id,
            plant,
          ],
        ),
      );
    const serverNow =
      new Date().toISOString();

    const plantsToPersist =
      plants.map(plant => {
        const remote =
          remoteById.get(plant.id);

        return remote
          ? mergeCareHistoryPlant(
              remote,
              plant,
              serverNow,
            )
          : plant;
      });

    if (plantsToPersist.length > 0) {
      await env.DB.batch(
        plantsToPersist.map(
          plant =>
            createPlantUpsert(
              env.DB,
              user.id,
              plant,
            ),
        ),
      );
    }

    const persistedPlants =
      await getPlantsForUser(
        env.DB,
        user.id,
      );
    const persistedById =
      new Map(
        persistedPlants.map(
          plant => [plant.id, plant],
        ),
      );

    const syncStateIsComplete =
      plantsToPersist.every(candidate => {
        const persisted =
          persistedById.get(candidate.id);

        return persisted !== undefined &&
          hasAllCareHistory(
            persisted,
            candidate,
          ) &&
          hasAllPhotoTombstones(
            persisted,
            candidate,
          );
      });

    if (syncStateIsComplete) {
      return json({
        plants: persistedPlants,
        syncedAt:
          new Date().toISOString(),
      });
    }
  }

  return json(
    {
      error: "Не удалось завершить синхронизацию истории ухода и удалённых фотографий из-за параллельных изменений. Повторите попытку.",
      retryable: true,
    },
    { status: 409 },
  );
}
