import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  PlantLocation,
  PlantNote,
  PlantReminder,
  UserPlant,
} from "../types";

import type {
  PreparedPhoto,
} from "../services/preparePhoto";

import {
  clearLocalGarden,
  getAllPlantRecords,
  getAllPlants,
  replaceAllPlantRecords,
  replacePlants as replacePlantsInDb,
  savePlant,
  savePlantPhotoGallery,
  softDeletePlant,
  type SavePlantPhotoInput,
} from "../repository/gardenRepository";

import {
  migrateLegacyStorage,
} from "../repository/migrateLegacyStorage";

import {
  migrateSyncMetadata,
} from "../repository/migrateSyncMetadata";
import { getPlantPhotoIds, MAX_PLANT_PHOTOS } from "../model/photos";

import {
  syncGarden,
} from "../sync/syncGarden";

function todayStr(): string {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function nowIso(): string {
  return new Date()
    .toISOString();
}

function createId(): string {
  if (
    typeof crypto.randomUUID ===
    "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    Math.random()
      .toString(36)
      .slice(2) +
    Date.now().toString(36)
  );
}

export interface GardenOperationResult {
  ok: boolean;
  error?: string;
}

export type GardenSyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

export interface GardenSyncResult
  extends GardenOperationResult {
  syncedAt?: string;
}

export interface AddPlantInput {
  catalogId: string | null;

  nickname: string;

  wateringInterval: number;

  location?: PlantLocation;

  photo?: PreparedPhoto | null;

  extra?: Partial<UserPlant>;
}

export interface UpdatePlantPhotoOptions {
  photo?:
    | PreparedPhoto
    | null;

  removePhoto?: boolean;

  gallery?: Array<{ index: number; photo: PreparedPhoto | null }>;
}

function errorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Не удалось сохранить данные.";
}

function createdAtFromPlant(
  plant: Partial<UserPlant>,
  fallback: string,
): string {
  if (
    typeof plant.createdAt ===
      "string" &&
    Number.isFinite(
      Date.parse(
        plant.createdAt,
      ),
    )
  ) {
    return plant.createdAt;
  }

  if (
    typeof plant.addedAt ===
      "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      plant.addedAt,
    )
  ) {
    return `${plant.addedAt}T00:00:00.000Z`;
  }

  return fallback;
}

/**
 * Импорт из резервной копии считается
 * новым локальным изменением.
 *
 * Поэтому updatedAt = время импорта.
 */
function sanitizeImportedPlant(
  plant: UserPlant,
  importTime: string,
): UserPlant {
  const value =
    plant as UserPlant & {
      photo?: unknown;
    };

  const {
    photo: _legacyPhoto,
    ...withoutLegacyPhoto
  } = value;

  return {
    ...withoutLegacyPhoto,

    photoId:
      typeof withoutLegacyPhoto
        .photoId === "string"
        ? withoutLegacyPhoto
            .photoId
        : null,

    createdAt:
      createdAtFromPlant(
        withoutLegacyPhoto,
        importTime,
      ),

    updatedAt:
      importTime,

    deletedAt: null,
  };
}

export function useGarden() {
  const [
    plants,
    setPlants,
  ] = useState<UserPlant[]>(
    [],
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    storageError,
    setStorageError,
  ] = useState<
    string | null
  >(null);

  const [
    syncStatus,
    setSyncStatus,
  ] =
    useState<GardenSyncStatus>(
      "idle",
    );

  const [
    syncError,
    setSyncError,
  ] = useState<
    string | null
  >(null);

  const [
    lastSyncedAt,
    setLastSyncedAt,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        /*
         * 1. Старая migration:
         * localStorage → IndexedDB.
         */
        await migrateLegacyStorage();

        /*
         * 2. Новая migration:
         * timestamps для sync.
         */
        await migrateSyncMetadata();

        const storedPlants =
          await getAllPlants();

        if (active) {
          setPlants(
            storedPlants,
          );

          setStorageError(
            null,
          );
        }
      } catch (error) {
        if (active) {
          setStorageError(
            errorMessage(
              error,
            ),
          );
        }
      } finally {
        if (active) {
          setIsLoading(
            false,
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const execute =
    useCallback(
      async (
        operation:
          () => Promise<void>,
      ): Promise<
        GardenOperationResult
      > => {
        try {
          await operation();

          setStorageError(
            null,
          );

          return {
            ok: true,
          };
        } catch (error) {
          const message =
            errorMessage(
              error,
            );

          setStorageError(
            message,
          );

          return {
            ok: false,
            error: message,
          };
        }
      },
      [],
    );

  const addPlant =
    useCallback(
      async ({
        catalogId,
        nickname,
        wateringInterval,
        location = "home",
        photo = null,
        extra = {},
      }: AddPlantInput): Promise<
        GardenOperationResult
      > => {
        const plantId =
          createId();

        const photoId =
          photo
            ? createId()
            : null;

        const timestamp =
          nowIso();

        const plant:
          UserPlant = {
          ...extra,

          id:
            plantId,

          catalogId,

          nickname,

          photoId,

          photoIds: photoId ? [photoId] : [],

          wateringInterval,

          location,

          wateringHistory:
            extra
              .wateringHistory ??
            [],

          mistingHistory:
            extra
              .mistingHistory ??
            [],

          fertilizingInterval:
            extra
              .fertilizingInterval ??
            30,

          fertilizingHistory:
            extra
              .fertilizingHistory ??
            [],

          notes:
            extra.notes ??
            [],

          reminders:
            extra.reminders ??
            [],

          addedAt:
            extra.addedAt ??
            todayStr(),

          createdAt:
            timestamp,

          updatedAt:
            timestamp,

          deletedAt:
            null,
        };

        return execute(
          async () => {
            const photoRecord:
              | SavePlantPhotoInput
              | null =
              photo &&
              photoId
                ? {
                    id:
                      photoId,

                    plantId,

                    blob:
                      photo.blob,

                    mimeType:
                      photo.mimeType,

                    width:
                      photo.width,

                    height:
                      photo.height,
                  }
                : null;

            await savePlant(
              plant,
              photoRecord,
            );

            setPlants(
              current => [
                ...current,
                plant,
              ],
            );
          },
        );
      },
      [execute],
    );

  const updatePlant =
    useCallback(
      async (
        id: string,

        changes:
          Partial<UserPlant>,

        photoOptions:
          UpdatePlantPhotoOptions =
            {},
      ): Promise<
        GardenOperationResult
      > => {
        const currentPlant =
          plants.find(
            plant =>
              plant.id === id,
          );

        if (!currentPlant) {
          return {
            ok: false,
            error:
              "Растение не найдено.",
          };
        }

        const {
          photo = null,
          removePhoto = false,
          gallery,
        } = photoOptions;

        if (gallery) {
          const currentIds = getPlantPhotoIds(currentPlant);
          const removedIds: string[] = [];
          const newPhotos: SavePlantPhotoInput[] = [];
          const updates = new Map(gallery.map(update => [update.index, update.photo]));
          const nextIds: string[] = [];

          for (let index = 0; index < MAX_PLANT_PHOTOS; index += 1) {
            const previousId = currentIds[index];
            if (!updates.has(index)) {
              if (previousId) nextIds.push(previousId);
              continue;
            }
            if (previousId) removedIds.push(previousId);
          }
          for (let index = 0; index < MAX_PLANT_PHOTOS; index += 1) {
            const nextPhoto = updates.get(index);
            if (nextPhoto) {
              const id = createId();
              nextIds.push(id);
              newPhotos.push({ id, plantId: currentPlant.id, ...nextPhoto });
            }
          }
          const normalizedIds = nextIds.filter(Boolean).slice(0, MAX_PLANT_PHOTOS);
          const nextPlant = {
            ...currentPlant,
            ...changes,
            photoIds: normalizedIds,
            photoId: normalizedIds.at(-1) ?? null,
            updatedAt: nowIso(),
            deletedAt: null,
          };
          return execute(async () => {
            await savePlantPhotoGallery(nextPlant, newPhotos, removedIds);
            setPlants(current => current.map(item => item.id === id ? nextPlant : item));
          });
        }

        const nextPhotoId =
          photo
            ? createId()
            : removePhoto
              ? null
              : currentPlant
                  .photoId;

        const nextPlant:
          UserPlant = {
          ...currentPlant,

          ...changes,

          id:
            currentPlant.id,

          photoId:
            nextPhotoId,

          createdAt:
            currentPlant
              .createdAt,

          updatedAt:
            nowIso(),

          deletedAt:
            null,
        };

        return execute(
          async () => {
            const photoRecord:
              | SavePlantPhotoInput
              | null =
              photo &&
              nextPhotoId
                ? {
                    id:
                      nextPhotoId,

                    plantId:
                      id,

                    blob:
                      photo.blob,

                    mimeType:
                      photo.mimeType,

                    width:
                      photo.width,

                    height:
                      photo.height,
                  }
                : null;

            await savePlant(
              nextPlant,
              photoRecord,
              photo ||
                removePhoto
                ? currentPlant
                    .photoId
                : null,
            );

            setPlants(
              current =>
                current.map(
                  plant =>
                    plant.id ===
                    id
                      ? nextPlant
                      : plant,
                ),
            );
          },
        );
      },
      [
        execute,
        plants,
      ],
    );

  const removePlant =
    useCallback(
      async (
        id: string,
      ): Promise<
        GardenOperationResult
      > => {
        const plant =
          plants.find(
            item =>
              item.id === id,
          );

        if (!plant) {
          return {
            ok: false,
            error:
              "Растение не найдено.",
          };
        }

        const timestamp =
          nowIso();

        const tombstone:
          UserPlant = {
          ...plant,

          updatedAt:
            timestamp,

          deletedAt:
            timestamp,
        };

        return execute(
          async () => {
            await softDeletePlant(
              tombstone,
            );

            setPlants(
              current =>
                current.filter(
                  item =>
                    item.id !== id,
                ),
            );
          },
        );
      },
      [
        execute,
        plants,
      ],
    );

  const mutatePlant =
    useCallback(
      async (
        id: string,

        mutate:
          (
            plant:
              UserPlant,
          ) => UserPlant,
      ): Promise<
        GardenOperationResult
      > => {
        const currentPlant =
          plants.find(
            plant =>
              plant.id === id,
          );

        if (!currentPlant) {
          return {
            ok: false,
            error:
              "Растение не найдено.",
          };
        }

        const mutated =
          mutate(
            currentPlant,
          );

        const nextPlant:
          UserPlant = {
          ...mutated,

          id:
            currentPlant.id,

          createdAt:
            currentPlant
              .createdAt,

          updatedAt:
            nowIso(),

          deletedAt:
            null,
        };

        return execute(
          async () => {
            await savePlant(
              nextPlant,
            );

            setPlants(
              current =>
                current.map(
                  plant =>
                    plant.id ===
                    id
                      ? nextPlant
                      : plant,
                ),
            );
          },
        );
      },
      [
        execute,
        plants,
      ],
    );

  const addHistoryEntry =
    useCallback(
      (
        id: string,

        field:
          | "wateringHistory"
          | "mistingHistory"
          | "fertilizingHistory",
      ) =>
        mutatePlant(
          id,
          plant => {
            const today = todayStr();

            if (plant[field].includes(today)) {
              return plant;
            }

            return {
              ...plant,
              [field]: [
                ...plant[field],
                today,
              ],
            };
          },
        ),
      [mutatePlant],
    );

  const addNote =
    useCallback(
      (
        id: string,
        content: string,
      ) => {
        const note:
          PlantNote = {
          id:
            createId(),

          createdAt:
            todayStr(),

          content,
        };

        return mutatePlant(
          id,
          plant => ({
            ...plant,

            notes: [
              ...plant.notes,
              note,
            ],
          }),
        );
      },
      [mutatePlant],
    );

  const updateNote =
    useCallback(
      (
        plantId: string,
        noteId: string,
        content: string,
      ) =>
        mutatePlant(
          plantId,
          plant => ({
            ...plant,

            notes:
              plant.notes.map(
                note =>
                  note.id ===
                  noteId
                    ? {
                        ...note,
                        content,
                      }
                    : note,
              ),
          }),
        ),
      [mutatePlant],
    );

  const deleteNote =
    useCallback(
      (
        plantId: string,
        noteId: string,
      ) =>
        mutatePlant(
          plantId,
          plant => ({
            ...plant,

            notes:
              plant.notes.filter(
                note =>
                  note.id !==
                  noteId,
              ),
          }),
        ),
      [mutatePlant],
    );

  const addReminder =
    useCallback(
      (
        plantId: string,
        title: string,
        date: string,
      ) => {
        const reminder:
          PlantReminder = {
          id:
            createId(),

          title,
          date,

          done: false,
        };

        return mutatePlant(
          plantId,
          plant => ({
            ...plant,

            reminders: [
              ...plant.reminders,
              reminder,
            ],
          }),
        );
      },
      [mutatePlant],
    );

  const toggleReminder =
    useCallback(
      (
        plantId: string,
        reminderId: string,
      ) =>
        mutatePlant(
          plantId,
          plant => ({
            ...plant,

            reminders:
              plant.reminders.map(
                reminder =>
                  reminder.id ===
                  reminderId
                    ? {
                        ...reminder,

                        done:
                          !reminder
                            .done,
                      }
                    : reminder,
              ),
          }),
        ),
      [mutatePlant],
    );

  const deleteReminder =
    useCallback(
      (
        plantId: string,
        reminderId: string,
      ) =>
        mutatePlant(
          plantId,
          plant => ({
            ...plant,

            reminders:
              plant.reminders.filter(
                reminder =>
                  reminder.id !==
                  reminderId,
              ),
          }),
        ),
      [mutatePlant],
    );

  const replacePlants =
    useCallback(
      async (
        nextPlants:
          UserPlant[],
      ): Promise<
        GardenOperationResult
      > => {
        const importTime =
          nowIso();

        const sanitized =
          nextPlants.map(
            plant =>
              sanitizeImportedPlant(
                plant,
                importTime,
              ),
          );

        return execute(
          async () => {
            await replacePlantsInDb(
              sanitized,
            );

            setPlants(
              sanitized.filter(
                plant =>
                  plant.deletedAt ===
                  null,
              ),
            );
          },
        );
      },
      [execute],
    );

  const reload =
    useCallback(
      async (): Promise<
        GardenOperationResult
      > =>
        execute(
          async () => {
            setPlants(
              await getAllPlants(),
            );
          },
        ),
      [execute],
    );

  const clearGarden =
    useCallback(
      async (): Promise<GardenOperationResult> =>
        execute(
          async () => {
            await clearLocalGarden();
            setPlants([]);
            setSyncStatus("idle");
            setSyncError(null);
            setLastSyncedAt(null);
          },
        ),
      [execute],
    );

  /**
   * Полная двусторонняя
   * синхронизация растений.
   *
   * Вызывается только когда
   * пользователь авторизован.
   */
  const syncWithCloud =
    useCallback(
      async (): Promise<
        GardenSyncResult
      > => {
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          setSyncStatus(
            "offline",
          );

          setSyncError(
            null,
          );

          return {
            ok: false,

            error:
              "Нет подключения к интернету.",
          };
        }

        setSyncStatus(
          "syncing",
        );

        setSyncError(
          null,
        );

        try {
          const localRecords =
            await getAllPlantRecords();

          const result =
            await syncGarden(
              localRecords,
            );

          await replaceAllPlantRecords(
            result.plants,
          );

          setPlants(
            result.plants.filter(
              plant =>
                plant.deletedAt ===
                null,
            ),
          );

          setLastSyncedAt(
            result.syncedAt,
          );

          setSyncStatus(
            "synced",
          );

          return {
            ok: true,

            syncedAt:
              result.syncedAt,
          };
        } catch (error) {
          const message =
            errorMessage(
              error,
            );

          setSyncStatus(
            "error",
          );

          setSyncError(
            message,
          );

          return {
            ok: false,
            error: message,
          };
        }
      },
      [],
    );

  return {
    plants,

    isLoading,

    storageError,

    syncStatus,
    syncError,
    lastSyncedAt,

    reload,

    clearGarden,

    syncWithCloud,

    addPlant,

    removePlant,

    updatePlant,

    replacePlants,

    waterPlant:
      (id: string) =>
        addHistoryEntry(
          id,
          "wateringHistory",
        ),

    mistPlant:
      (id: string) =>
        addHistoryEntry(
          id,
          "mistingHistory",
        ),

    fertilizePlant:
      (id: string) =>
        addHistoryEntry(
          id,
          "fertilizingHistory",
        ),

    addNote,

    updateNote,

    deleteNote,

    addReminder,

    toggleReminder,

    deleteReminder,
  };
}
