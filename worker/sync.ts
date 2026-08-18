import {
  createAuth,
  type AuthEnv,
} from "./auth";
import {
  mergeCareHistoryPlant,
} from "./syncMerge";

export interface SyncEnv extends AuthEnv {
  APP_ENV: string;
}

interface SupplementalLightSchedule {
  start: string;
  end: string;
}

export interface SyncPlant {
  id: string;
  catalogId: string | null;
  customName?: string;
  customLatinName?: string;
  customDescription?: string;
  customEmoji?: string;
  nickname: string;
  photoId: string | null;
  photoIds: string[];
  wateringInterval: number;
  wateringHistory: string[];
  mistingEnabled: boolean;
  mistingHistory: string[];
  fertilizingInterval: number;
  fertilizingHistory: string[];
  supplementalLight: SupplementalLightSchedule | null;
  addedAt: string;
  location: "home" | "outdoor";
  notes: unknown[];
  reminders: unknown[];
  externalTaxon?: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface PlantRow {
  id: string;
  user_id: string;
  catalog_id: string | null;
  custom_name: string | null;
  custom_latin_name: string | null;
  custom_description: string | null;
  custom_emoji: string | null;
  nickname: string;
  photo_id: string | null;
  photo_ids: string;
  watering_interval: number;
  watering_history: string;
  misting_enabled: number;
  misting_history: string;
  fertilizing_interval: number;
  fertilizing_history: string;
  supplemental_light: string | null;
  added_at: string;
  location: string;
  notes: string;
  reminders: string;
  external_taxon: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidDateString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(
      Date.parse(value),
    )
  );
}

function isValidTime(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
      value,
    )
  );
}

function optionalString(
  value: unknown,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function nullableString(
  value: unknown,
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function stringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string",
  );
}

function unknownArray(
  value: unknown,
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function positiveNumber(
  value: unknown,
  fallback: number,
): number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : fallback;
}

function normalizeSupplementalLight(
  value: unknown,
): SupplementalLightSchedule | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isValidTime(value.start) ||
    !isValidTime(value.end) ||
    value.start === value.end
  ) {
    return null;
  }

  return {
    start: value.start,
    end: value.end,
  };
}

function normalizeSyncPlant(
  value: unknown,
): SyncPlant {
  if (!isRecord(value)) {
    throw new Error(
      "Некорректная запись растения.",
    );
  }

  if (
    typeof value.id !== "string" ||
    !value.id
  ) {
    throw new Error(
      "У растения отсутствует id.",
    );
  }

  if (
    typeof value.nickname !== "string"
  ) {
    throw new Error(
      `У растения ${value.id} отсутствует nickname.`,
    );
  }

  if (
    !isValidDateString(value.createdAt)
  ) {
    throw new Error(
      `У растения ${value.id} отсутствует корректный createdAt.`,
    );
  }

  if (
    !isValidDateString(value.updatedAt)
  ) {
    throw new Error(
      `У растения ${value.id} отсутствует корректный updatedAt.`,
    );
  }

  if (
    value.deletedAt !== null &&
    value.deletedAt !== undefined &&
    !isValidDateString(value.deletedAt)
  ) {
    throw new Error(
      `У растения ${value.id} некорректный deletedAt.`,
    );
  }

  const location =
    value.location === "outdoor"
      ? "outdoor"
      : "home";
  const photoIds =
    stringArray(value.photoIds)
      .slice(-3);
  const legacyPhotoId =
    nullableString(value.photoId);

  return {
    id: value.id,
    catalogId:
      nullableString(value.catalogId),
    customName:
      optionalString(value.customName),
    customLatinName:
      optionalString(
        value.customLatinName,
      ),
    customDescription:
      optionalString(
        value.customDescription,
      ),
    customEmoji:
      optionalString(value.customEmoji),
    nickname: value.nickname,
    photoId: legacyPhotoId,
    photoIds:
      photoIds.length > 0
        ? photoIds
        : legacyPhotoId
          ? [legacyPhotoId]
          : [],
    wateringInterval:
      positiveNumber(
        value.wateringInterval,
        7,
      ),
    wateringHistory:
      stringArray(
        value.wateringHistory,
      ),
    mistingEnabled:
      value.mistingEnabled !== false,
    mistingHistory:
      stringArray(
        value.mistingHistory,
      ),
    fertilizingInterval:
      positiveNumber(
        value.fertilizingInterval,
        30,
      ),
    fertilizingHistory:
      stringArray(
        value.fertilizingHistory,
      ),
    supplementalLight:
      normalizeSupplementalLight(
        value.supplementalLight,
      ),
    addedAt:
      typeof value.addedAt === "string"
        ? value.addedAt
        : value.createdAt.slice(0, 10),
    location,
    notes:
      unknownArray(value.notes),
    reminders:
      unknownArray(value.reminders),
    externalTaxon:
      isRecord(value.externalTaxon)
        ? value.externalTaxon
        : undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    deletedAt:
      typeof value.deletedAt === "string"
        ? value.deletedAt
        : null,
  };
}

function safeJsonArray(
  value: string,
): unknown[] {
  try {
    const parsed: unknown =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function safeStringArray(
  value: string,
): string[] {
  return safeJsonArray(value)
    .filter(
      (item): item is string =>
        typeof item === "string",
    );
}

function safeJsonObject(
  value: string | null,
): unknown | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown =
      JSON.parse(value);

    return isRecord(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function safeSupplementalLight(
  value: string | null,
): SupplementalLightSchedule | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeSupplementalLight(
      JSON.parse(value),
    );
  } catch {
    return null;
  }
}

function rowToPlant(
  row: PlantRow,
): SyncPlant {
  return {
    id: row.id,
    catalogId: row.catalog_id,
    customName:
      row.custom_name ?? undefined,
    customLatinName:
      row.custom_latin_name ??
      undefined,
    customDescription:
      row.custom_description ??
      undefined,
    customEmoji:
      row.custom_emoji ?? undefined,
    nickname: row.nickname,
    photoId: row.photo_id,
    photoIds:
      safeStringArray(row.photo_ids)
        .slice(-3),
    wateringInterval:
      row.watering_interval,
    wateringHistory:
      safeStringArray(
        row.watering_history,
      ),
    mistingEnabled:
      row.misting_enabled !== 0,
    mistingHistory:
      safeStringArray(
        row.misting_history,
      ),
    fertilizingInterval:
      row.fertilizing_interval,
    fertilizingHistory:
      safeStringArray(
        row.fertilizing_history,
      ),
    supplementalLight:
      safeSupplementalLight(
        row.supplemental_light,
      ),
    addedAt: row.added_at,
    location:
      row.location === "outdoor"
        ? "outdoor"
        : "home",
    notes:
      safeJsonArray(row.notes),
    reminders:
      safeJsonArray(row.reminders),
    externalTaxon:
      safeJsonObject(
        row.external_taxon,
      ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
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

  await env.DB
    .prepare(`
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
    `)
    .bind(
      user.id,
      user.email,
      now,
    )
    .run();
}

function createPlantUpsert(
  env: SyncEnv,
  userId: string,
  plant: SyncPlant,
): D1PreparedStatement {
  return env.DB
    .prepare(`
      INSERT INTO plants (
        id,
        user_id,
        catalog_id,
        custom_name,
        custom_latin_name,
        custom_description,
        custom_emoji,
        nickname,
        photo_id,
        photo_ids,
        watering_interval,
        watering_history,
        misting_enabled,
        misting_history,
        fertilizing_interval,
        fertilizing_history,
        supplemental_light,
        added_at,
        location,
        notes,
        reminders,
        external_taxon,
        created_at,
        updated_at,
        deleted_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        catalog_id = excluded.catalog_id,
        custom_name = excluded.custom_name,
        custom_latin_name = excluded.custom_latin_name,
        custom_description = excluded.custom_description,
        custom_emoji = excluded.custom_emoji,
        nickname = excluded.nickname,
        photo_id = excluded.photo_id,
        photo_ids = excluded.photo_ids,
        watering_interval = excluded.watering_interval,
        watering_history = excluded.watering_history,
        misting_enabled = excluded.misting_enabled,
        misting_history = excluded.misting_history,
        fertilizing_interval = excluded.fertilizing_interval,
        fertilizing_history = excluded.fertilizing_history,
        supplemental_light = excluded.supplemental_light,
        added_at = excluded.added_at,
        location = excluded.location,
        notes = excluded.notes,
        reminders = excluded.reminders,
        external_taxon = excluded.external_taxon,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
      WHERE
        plants.user_id =
          excluded.user_id
        AND
        excluded.updated_at >=
          plants.updated_at
    `)
    .bind(
      plant.id,
      userId,
      plant.catalogId,
      plant.customName ?? null,
      plant.customLatinName ?? null,
      plant.customDescription ?? null,
      plant.customEmoji ?? null,
      plant.nickname,
      plant.photoId,
      JSON.stringify(plant.photoIds),
      plant.wateringInterval,
      JSON.stringify(
        plant.wateringHistory,
      ),
      plant.mistingEnabled
        ? 1
        : 0,
      JSON.stringify(
        plant.mistingHistory,
      ),
      plant.fertilizingInterval,
      JSON.stringify(
        plant.fertilizingHistory,
      ),
      plant.supplementalLight
        ? JSON.stringify(
            plant.supplementalLight,
          )
        : null,
      plant.addedAt,
      plant.location,
      JSON.stringify(plant.notes),
      JSON.stringify(plant.reminders),
      plant.externalTaxon
        ? JSON.stringify(
            plant.externalTaxon,
          )
        : null,
      plant.createdAt,
      plant.updatedAt,
      plant.deletedAt,
    );
}

async function getPlantsForUser(
  env: SyncEnv,
  userId: string,
): Promise<SyncPlant[]> {
  const result =
    await env.DB
      .prepare(`
        SELECT
          id,
          user_id,
          catalog_id,
          custom_name,
          custom_latin_name,
          custom_description,
          custom_emoji,
          nickname,
          photo_id,
          photo_ids,
          watering_interval,
          watering_history,
          misting_enabled,
          misting_history,
          fertilizing_interval,
          fertilizing_history,
          supplemental_light,
          added_at,
          location,
          notes,
          reminders,
          external_taxon,
          created_at,
          updated_at,
          deleted_at
        FROM plants
        WHERE user_id = ?1
        ORDER BY updated_at ASC
      `)
      .bind(userId)
      .all<PlantRow>();

  return result.results.map(
    rowToPlant,
  );
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
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  await ensureAppUser(
    env,
    user,
  );

  const plants =
    await getPlantsForUser(
      env,
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
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
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
      {
        error:
          "Некорректный JSON.",
      },
      {
        status: 400,
      },
    );
  }

  if (!Array.isArray(body.plants)) {
    return json(
      {
        error:
          "Поле plants должно быть массивом.",
      },
      {
        status: 400,
      },
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
      {
        status: 400,
      },
    );
  }

  await ensureAppUser(
    env,
    user,
  );

  const remotePlants =
    await getPlantsForUser(
      env,
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

  if (
    plantsToPersist.length > 0
  ) {
    const statements =
      plantsToPersist.map(
        plant =>
          createPlantUpsert(
            env,
            user.id,
            plant,
          ),
      );

    await env.DB.batch(
      statements,
    );
  }

  const mergedPlants =
    await getPlantsForUser(
      env,
      user.id,
    );

  return json({
    plants: mergedPlants,
    syncedAt:
      new Date().toISOString(),
  });
}
