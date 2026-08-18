import {
  normalizeSupplementalLight,
} from "../garden/model/carePreferences";
import type {
  PlantLocation,
  UserPlant,
} from "../garden/types";

export const BACKUP_VERSION =
  2 as const;

export type BackupTab =
  | "home"
  | "garden"
  | "catalog"
  | "checklist"
  | "add";

export interface PlantCareSettings {
  lastActiveTab: BackupTab;
}

export const DEFAULT_SETTINGS:
  PlantCareSettings = {
    lastActiveTab: "home",
  };

export interface PlantCareBackup {
  app: "plantcare";
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  settings: PlantCareSettings;
  plants: UserPlant[];
}

interface LegacyBackup {
  version: 1;
  exportedAt?: string;
  plants: unknown[];
}

export interface BackupParseResult {
  backup: PlantCareBackup | null;
  error?: string;
  migratedFrom?: number;
}

export function mergeBackupPlants(
  current: UserPlant[],
  incoming: UserPlant[],
): {
  plants: UserPlant[];
  addedCount: number;
} {
  const existingIds =
    new Set(
      current.map(plant => plant.id),
    );
  const additions =
    incoming.filter(
      plant =>
        !existingIds.has(plant.id),
    );

  return {
    plants: [
      ...current,
      ...additions,
    ],
    addedCount: additions.length,
  };
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function stringArray(
  value: unknown,
): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string",
      )
    : [];
}

function migratePlant(
  value: unknown,
): UserPlant | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.nickname !== "string"
  ) {
    return null;
  }

  const location: PlantLocation =
    value.location === "outdoor"
      ? "outdoor"
      : "home";

  return {
    ...value,
    id: value.id,
    catalogId:
      typeof value.catalogId ===
      "string"
        ? value.catalogId
        : null,
    nickname: value.nickname,
    photo:
      typeof value.photo === "string"
        ? value.photo
        : null,
    wateringInterval:
      typeof value.wateringInterval ===
      "number"
        ? value.wateringInterval
        : 7,
    wateringHistory:
      stringArray(
        value.wateringHistory,
      ),
    ...(typeof value.mistingEnabled ===
      "boolean"
      ? {
          mistingEnabled:
            value.mistingEnabled,
        }
      : {}),
    mistingHistory:
      stringArray(
        value.mistingHistory,
      ),
    fertilizingInterval:
      typeof value.fertilizingInterval ===
      "number"
        ? value.fertilizingInterval
        : 30,
    fertilizingHistory:
      stringArray(
        value.fertilizingHistory,
      ),
    ...(value.supplementalLight !==
    undefined
      ? {
          supplementalLight:
            normalizeSupplementalLight(
              value.supplementalLight,
            ),
        }
      : {}),
    addedAt:
      typeof value.addedAt === "string"
        ? value.addedAt
        : new Date()
            .toISOString()
            .slice(0, 10),
    location,
    notes:
      Array.isArray(value.notes)
        ? value.notes as
            UserPlant["notes"]
        : [],
    reminders:
      Array.isArray(value.reminders)
        ? value.reminders as
            UserPlant["reminders"]
        : [],
  } as UserPlant;
}

function normalizeSettings(
  value: unknown,
): PlantCareSettings {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_SETTINGS,
    };
  }

  const tabs: BackupTab[] = [
    "home",
    "garden",
    "catalog",
    "checklist",
    "add",
  ];

  return {
    lastActiveTab:
      tabs.includes(
        value.lastActiveTab as
          BackupTab,
      )
        ? value.lastActiveTab as
            BackupTab
        : "home",
  };
}

export function createBackup(
  plants: UserPlant[],
  settings: PlantCareSettings =
    DEFAULT_SETTINGS,
): PlantCareBackup {
  return {
    app: "plantcare",
    version: BACKUP_VERSION,
    exportedAt:
      new Date().toISOString(),
    settings:
      normalizeSettings(settings),
    plants,
  };
}

export function parseBackup(
  raw: unknown,
): BackupParseResult {
  if (
    !isRecord(raw) ||
    !Array.isArray(raw.plants)
  ) {
    return {
      backup: null,
      error:
        "Файл не является резервной копией PlantCare.",
    };
  }

  const version = raw.version;

  if (
    version !== 1 &&
    version !== BACKUP_VERSION
  ) {
    return {
      backup: null,
      error:
        "Эта версия резервной копии пока не поддерживается.",
    };
  }

  if (
    version === BACKUP_VERSION &&
    raw.app !== "plantcare"
  ) {
    return {
      backup: null,
      error:
        "Файл создан другим приложением.",
    };
  }

  const plants =
    raw.plants.map(migratePlant);

  if (
    plants.some(
      plant => plant === null,
    )
  ) {
    return {
      backup: null,
      error:
        "В файле есть повреждённые записи растений.",
    };
  }

  const backup: PlantCareBackup = {
    app: "plantcare",
    version: BACKUP_VERSION,
    exportedAt:
      typeof raw.exportedAt ===
      "string"
        ? raw.exportedAt
        : new Date().toISOString(),
    settings:
      version === 1
        ? {
            ...DEFAULT_SETTINGS,
          }
        : normalizeSettings(
            raw.settings,
          ),
    plants: plants as UserPlant[],
  };

  return {
    backup,
    ...(version === 1
      ? {
          migratedFrom: 1,
        }
      : {}),
  };
}

export function serializeBackup(
  backup: PlantCareBackup,
): string {
  return JSON.stringify(
    backup,
    null,
    2,
  );
}

export function downloadBackup(
  backup: PlantCareBackup,
): void {
  const blob = new Blob(
    [serializeBackup(backup)],
    {
      type:
        "application/json;charset=utf-8",
    },
  );
  const url =
    URL.createObjectURL(blob);
  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    `plantcare-${backup.exportedAt.slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(
    () =>
      URL.revokeObjectURL(url),
    0,
  );
}
