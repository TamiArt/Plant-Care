import type {
  UserPlant,
} from "../../types";

import {
  getAllPlantPhotos,
  getPlantPhoto,
  saveDownloadedPhoto,
} from "../../repository/gardenRepository";

import {
  compressPhotoForCloud,
} from "../../services/compressPhotoForCloud";
import { getPlantPhotoIds } from "../../model/photos";

import {
  downloadPhotoFromCloud,
  uploadPhotoToCloud,
} from "./photoSyncApi";

/**
 * Отправляет только локальные фотографии,
 * которые относятся к текущей
 * авторитетной версии растения.
 */
export async function uploadLocalPhotos(
  plants: UserPlant[],
): Promise<void> {
  const photos =
    await getAllPlantPhotos();

  const plantsByPhotoId =
    new Map<string, UserPlant>();

  for (const plant of plants) {
    if (plant.deletedAt === null) {
      for (const photoId of getPlantPhotoIds(plant)) {
        plantsByPhotoId.set(
          photoId,
          plant,
        );
      }
    }
  }

  const errors: Error[] = [];

  for (const photo of photos) {
    const plant =
      plantsByPhotoId.get(photo.id);

    if (!plant || photo.plantId !== plant.id) {
      continue;
    }

    try {
      const compressed =
        await compressPhotoForCloud({
          blob: photo.blob,
          width: photo.width,
          height: photo.height,
          mimeType:
            photo.mimeType === "image/jpeg"
              ? "image/jpeg"
              : "image/webp",
        });

      await uploadPhotoToCloud(
        {
          ...photo,
          blob: compressed.blob,
          width: compressed.width,
          height: compressed.height,
          mimeType: compressed.mimeType,
        },
        photo.createdAt,
      );
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error
          : new Error("Не удалось синхронизировать фотографию."),
      );
    }
  }

  /*
   * One failed upload must not prevent the remaining photos from being
   * attempted. We still fail the sync afterwards so the local metadata is
   * not replaced by a cloud snapshot until every photo has been uploaded.
   */
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `Не удалось синхронизировать ${errors.length} фотографий.`,
    );
  }
}

/**
 * Загружает из облака фотографии,
 * которых нет на текущем устройстве.
 */
export async function downloadMissingPhotos(
  plants: UserPlant[],
): Promise<void> {
  const errors: Error[] = [];

  for (const plant of plants) {
    if (plant.deletedAt !== null) {
      continue;
    }

    for (const photoId of getPlantPhotoIds(plant)) {
      const existing =
        await getPlantPhoto(photoId);

      if (existing) {
        continue;
      }

      try {
        const remote =
          await downloadPhotoFromCloud(
            photoId,
          );

        if (!remote) {
          throw new Error(
            `Фотография ${photoId} отсутствует в облаке.`,
          );
        }

        await saveDownloadedPhoto({
          id: photoId,
          plantId: plant.id,
          blob: remote.blob,
          mimeType: remote.mimeType,
          width: remote.width,
          height: remote.height,
          createdAt: remote.updatedAt,
        });
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error
            : new Error("Не удалось скачать фотографию."),
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `Не удалось скачать ${errors.length} фотографий.`,
    );
  }
}

/**
 * Полная синхронизация Blob-фотографий.
 *
 * Порядок важен:
 *
 * 1. отправляем имеющиеся локальные;
 * 2. скачиваем недостающие.
 */
export async function syncPhotos(
  plants: UserPlant[],
): Promise<void> {
  await uploadLocalPhotos(
    plants,
  );

  await downloadMissingPhotos(
    plants,
  );
}
