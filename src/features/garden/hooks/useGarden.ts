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
import type { PreparedPhoto } from "../services/preparePhoto";
import {
  deletePlant as deletePlantFromDb,
  getAllPlants,
  replacePlants as replacePlantsInDb,
  savePlant,
  type SavePlantPhotoInput,
} from "../repository/gardenRepository";
import { migrateLegacyStorage } from "../repository/migrateLegacyStorage";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function createId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}

export interface GardenOperationResult {
  ok: boolean;
  error?: string;
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
  photo?: PreparedPhoto | null;
  removePhoto?: boolean;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Не удалось сохранить данные.";
}

function sanitizeImportedPlant(plant: UserPlant): UserPlant {
  const value = plant as UserPlant & { photo?: unknown };
  const {
    photo: _legacyPhoto,
    ...withoutLegacyPhoto
  } = value;

  return {
    ...withoutLegacyPhoto,
    photoId:
      typeof withoutLegacyPhoto.photoId === "string"
        ? withoutLegacyPhoto.photoId
        : null,
  };
}

export function useGarden() {
  const [plants, setPlants] = useState<UserPlant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await migrateLegacyStorage();
        const storedPlants = await getAllPlants();

        if (active) {
          setPlants(storedPlants);
          setStorageError(null);
        }
      } catch (error) {
        if (active) {
          setStorageError(errorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const execute = useCallback(
    async (
      operation: () => Promise<void>,
    ): Promise<GardenOperationResult> => {
      try {
        await operation();
        setStorageError(null);

        return { ok: true };
      } catch (error) {
        const message = errorMessage(error);
        setStorageError(message);

        return {
          ok: false,
          error: message,
        };
      }
    },
    [],
  );

  const addPlant = useCallback(
    async ({
      catalogId,
      nickname,
      wateringInterval,
      location = "home",
      photo = null,
      extra = {},
    }: AddPlantInput): Promise<GardenOperationResult> => {
      const plantId = createId();
      const photoId = photo ? createId() : null;

const plant: UserPlant = {
  ...extra,

  id: plantId,
  catalogId,
  nickname,
  photoId,
  wateringInterval,
  location,

  wateringHistory:
    extra.wateringHistory ?? [],

  mistingHistory:
    extra.mistingHistory ?? [],

  fertilizingInterval:
    extra.fertilizingInterval ?? 30,

  fertilizingHistory:
    extra.fertilizingHistory ?? [],

  notes:
    extra.notes ?? [],

  reminders:
    extra.reminders ?? [],

  addedAt:
    extra.addedAt ?? todayStr(),
};

      return execute(async () => {
        const photoRecord: SavePlantPhotoInput | null =
          photo && photoId
            ? {
                id: photoId,
                plantId,
                blob: photo.blob,
                mimeType: photo.mimeType,
                width: photo.width,
                height: photo.height,
              }
            : null;

        await savePlant(plant, photoRecord);
        setPlants(current => [...current, plant]);
      });
    },
    [execute],
  );

  const updatePlant = useCallback(
    async (
      id: string,
      changes: Partial<UserPlant>,
      photoOptions: UpdatePlantPhotoOptions = {},
    ): Promise<GardenOperationResult> => {
      const currentPlant = plants.find(
        plant => plant.id === id,
      );

      if (!currentPlant) {
        return {
          ok: false,
          error: "Растение не найдено.",
        };
      }

      const {
        photo = null,
        removePhoto = false,
      } = photoOptions;

      const nextPhotoId = photo
        ? createId()
        : removePhoto
          ? null
          : currentPlant.photoId;

      const nextPlant: UserPlant = {
        ...currentPlant,
        ...changes,
        id: currentPlant.id,
        photoId: nextPhotoId,
      };

      return execute(async () => {
        const photoRecord: SavePlantPhotoInput | null =
          photo && nextPhotoId
            ? {
                id: nextPhotoId,
                plantId: id,
                blob: photo.blob,
                mimeType: photo.mimeType,
                width: photo.width,
                height: photo.height,
              }
            : null;

        await savePlant(
          nextPlant,
          photoRecord,
          photo || removePhoto
            ? currentPlant.photoId
            : null,
        );

        setPlants(current =>
          current.map(plant =>
            plant.id === id ? nextPlant : plant,
          ),
        );
      });
    },
    [execute, plants],
  );

  const removePlant = useCallback(
    async (id: string): Promise<GardenOperationResult> => {
      const plant = plants.find(item => item.id === id);

      if (!plant) {
        return {
          ok: false,
          error: "Растение не найдено.",
        };
      }

      return execute(async () => {
        await deletePlantFromDb(plant);
        setPlants(current =>
          current.filter(item => item.id !== id),
        );
      });
    },
    [execute, plants],
  );

  const mutatePlant = useCallback(
    async (
      id: string,
      mutate: (plant: UserPlant) => UserPlant,
    ): Promise<GardenOperationResult> => {
      const currentPlant = plants.find(
        plant => plant.id === id,
      );

      if (!currentPlant) {
        return {
          ok: false,
          error: "Растение не найдено.",
        };
      }

      const nextPlant = mutate(currentPlant);

      return execute(async () => {
        await savePlant(nextPlant);

        setPlants(current =>
          current.map(plant =>
            plant.id === id ? nextPlant : plant,
          ),
        );
      });
    },
    [execute, plants],
  );

  const addHistoryEntry = useCallback(
    (
      id: string,
      field:
        | "wateringHistory"
        | "mistingHistory"
        | "fertilizingHistory",
    ) =>
      mutatePlant(id, plant => ({
        ...plant,
        [field]: [...plant[field], todayStr()],
      })),
    [mutatePlant],
  );

  const addNote = useCallback(
    (id: string, content: string) => {
      const note: PlantNote = {
        id: createId(),
        createdAt: todayStr(),
        content,
      };

      return mutatePlant(id, plant => ({
        ...plant,
        notes: [...plant.notes, note],
      }));
    },
    [mutatePlant],
  );

  const updateNote = useCallback(
    (
      plantId: string,
      noteId: string,
      content: string,
    ) =>
      mutatePlant(plantId, plant => ({
        ...plant,
        notes: plant.notes.map(note =>
          note.id === noteId
            ? { ...note, content }
            : note,
        ),
      })),
    [mutatePlant],
  );

  const deleteNote = useCallback(
    (plantId: string, noteId: string) =>
      mutatePlant(plantId, plant => ({
        ...plant,
        notes: plant.notes.filter(
          note => note.id !== noteId,
        ),
      })),
    [mutatePlant],
  );

  const addReminder = useCallback(
    (
      plantId: string,
      title: string,
      date: string,
    ) => {
      const reminder: PlantReminder = {
        id: createId(),
        title,
        date,
        done: false,
      };

      return mutatePlant(plantId, plant => ({
        ...plant,
        reminders: [
          ...plant.reminders,
          reminder,
        ],
      }));
    },
    [mutatePlant],
  );

  const toggleReminder = useCallback(
    (plantId: string, reminderId: string) =>
      mutatePlant(plantId, plant => ({
        ...plant,
        reminders: plant.reminders.map(reminder =>
          reminder.id === reminderId
            ? {
                ...reminder,
                done: !reminder.done,
              }
            : reminder,
        ),
      })),
    [mutatePlant],
  );

  const deleteReminder = useCallback(
    (plantId: string, reminderId: string) =>
      mutatePlant(plantId, plant => ({
        ...plant,
        reminders: plant.reminders.filter(
          reminder => reminder.id !== reminderId,
        ),
      })),
    [mutatePlant],
  );

  const replacePlants = useCallback(
    async (
      nextPlants: UserPlant[],
    ): Promise<GardenOperationResult> => {
      const sanitized = nextPlants.map(
        sanitizeImportedPlant,
      );

      return execute(async () => {
        await replacePlantsInDb(sanitized);
        setPlants(sanitized);
      });
    },
    [execute],
  );

  const reload = useCallback(
    async (): Promise<GardenOperationResult> =>
      execute(async () => {
        setPlants(await getAllPlants());
      }),
    [execute],
  );

  return {
    plants,
    isLoading,
    storageError,
    reload,
    addPlant,
    removePlant,
    updatePlant,
    replacePlants,
    waterPlant: (id: string) =>
      addHistoryEntry(id, "wateringHistory"),
    mistPlant: (id: string) =>
      addHistoryEntry(id, "mistingHistory"),
    fertilizePlant: (id: string) =>
      addHistoryEntry(id, "fertilizingHistory"),
    addNote,
    updateNote,
    deleteNote,
    addReminder,
    toggleReminder,
    deleteReminder,
  };
}
