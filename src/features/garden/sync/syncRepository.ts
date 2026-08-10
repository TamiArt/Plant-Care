import type {
  UserPlant,
} from "../types";

/**
 * В браузере API всегда same-origin.
 *
 * Development:
 * /api -> Vite -> localhost:8787
 *
 * Production:
 * /api -> Vercel -> Cloudflare Worker
 */
const API_BASE_URL =
  "/api";

export interface CloudSyncResult {
  plants: UserPlant[];
  syncedAt: string;
}

interface UnknownRecord {
  [key: string]: unknown;
}

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isIsoDate(
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

function normalizeRemotePlant(
  value: unknown,
): UserPlant {
  if (!isRecord(value)) {
    throw new Error(
      "Сервер вернул некорректное растение.",
    );
  }

  if (
    typeof value.id !==
      "string" ||
    typeof value.nickname !==
      "string" ||
    !isIsoDate(
      value.createdAt,
    ) ||
    !isIsoDate(
      value.updatedAt,
    )
  ) {
    throw new Error(
      "Сервер вернул растение с некорректными обязательными полями.",
    );
  }

  return {
    id:
      value.id,

    catalogId:
      typeof value.catalogId ===
      "string"
        ? value.catalogId
        : null,

    customName:
      typeof value.customName ===
      "string"
        ? value.customName
        : undefined,

    customLatinName:
      typeof value
        .customLatinName ===
      "string"
        ? value.customLatinName
        : undefined,

    customDescription:
      typeof value
        .customDescription ===
      "string"
        ? value.customDescription
        : undefined,

    customEmoji:
      typeof value.customEmoji ===
      "string"
        ? value.customEmoji
        : undefined,

    nickname:
      value.nickname,

    photoId:
      typeof value.photoId ===
      "string"
        ? value.photoId
        : null,

    wateringInterval:
      typeof value
        .wateringInterval ===
      "number"
        ? value.wateringInterval
        : 7,

    wateringHistory:
      Array.isArray(
        value.wateringHistory,
      )
        ? value.wateringHistory.filter(
            (
              item,
            ): item is string =>
              typeof item ===
              "string",
          )
        : [],

    mistingHistory:
      Array.isArray(
        value.mistingHistory,
      )
        ? value.mistingHistory.filter(
            (
              item,
            ): item is string =>
              typeof item ===
              "string",
          )
        : [],

    fertilizingInterval:
      typeof value
        .fertilizingInterval ===
      "number"
        ? value.fertilizingInterval
        : 30,

    fertilizingHistory:
      Array.isArray(
        value.fertilizingHistory,
      )
        ? value.fertilizingHistory.filter(
            (
              item,
            ): item is string =>
              typeof item ===
              "string",
          )
        : [],

    addedAt:
      typeof value.addedAt ===
      "string"
        ? value.addedAt
        : value.createdAt.slice(
            0,
            10,
          ),

    location:
      value.location ===
      "outdoor"
        ? "outdoor"
        : "home",

    notes:
      Array.isArray(
        value.notes,
      )
        ? (
            value.notes as
              UserPlant["notes"]
          )
        : [],

    reminders:
      Array.isArray(
        value.reminders,
      )
        ? (
            value.reminders as
              UserPlant[
                "reminders"
              ]
          )
        : [],

    externalTaxon:
      isRecord(
        value.externalTaxon,
      )
        ? (
            value.externalTaxon as
              unknown as
              UserPlant[
                "externalTaxon"
              ]
          )
        : undefined,

    createdAt:
      value.createdAt,

    updatedAt:
      value.updatedAt,

    deletedAt:
      isIsoDate(
        value.deletedAt,
      )
        ? value.deletedAt
        : null,
  };
}

async function readError(
  response: Response,
): Promise<string> {
  try {
    const data: unknown =
      await response.json();

    if (
      isRecord(data) &&
      typeof data.error ===
        "string"
    ) {
      return data.error;
    }
  } catch {
    // Ignore JSON parse failure.
  }

  return `HTTP ${response.status}`;
}

export async function syncPlantsWithCloud(
  localPlants: UserPlant[],
): Promise<CloudSyncResult> {
  const response =
    await fetch(
      `${API_BASE_URL}/sync/plants`,
      {
        method: "POST",

        credentials:
          "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            plants:
              localPlants,
          }),
      },
    );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
      ),
    );
  }

  const data: unknown =
    await response.json();

  if (
    !isRecord(data) ||
    !Array.isArray(
      data.plants,
    ) ||
    !isIsoDate(
      data.syncedAt,
    )
  ) {
    throw new Error(
      "Сервер вернул некорректный результат синхронизации.",
    );
  }

  return {
    plants:
      data.plants.map(
        normalizeRemotePlant,
      ),

    syncedAt:
      data.syncedAt,
  };
}