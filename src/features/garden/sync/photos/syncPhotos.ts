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
    new Map<
      string,
      UserPlant
    >();

  for (const plant of plants) {
    if (
      plant.deletedAt === null &&
      plant.photoId
    ) {
      plantsByPhotoId.set(
        plant.photoId,
        plant,
      );
    }
  }

  for (const photo of photos) {
    const plant =
      plantsByPhotoId.get(
        photo.id,
      );

    /*
     * Это либо:
     *
     * - старая фотография;
     * - фото удалённого растения;
     * - локальный orphan.
     *
     * В облако не отправляем.
     */
    if (!plant) {
      continue;
    }

    if (
      photo.plantId !==
      plant.id
    ) {
      continue;
    }

    const compressed =
      await compressPhotoForCloud({
        blob:
          photo.blob,

        width:
          photo.width,

        height:
          photo.height,

        mimeType:
          photo.mimeType ===
          "image/jpeg"
            ? "image/jpeg"
            : "image/webp",
      });

    await uploadPhotoToCloud(
      {
        ...photo,

        blob:
          compressed.blob,

        width:
          compressed.width,

        height:
          compressed.height,

        mimeType:
          compressed.mimeType,
      },

      /*
       * Важный момент:
       *
       * версия Blob не должна меняться
       * после обычного полива/заметки.
       *
       * Для нового фото создаётся новый
       * photoId и новый createdAt.
       */
      photo.createdAt,
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
  for (const plant of plants) {
    if (
      plant.deletedAt !==
        null ||
      !plant.photoId
    ) {
      continue;
    }

    const existing =
      await getPlantPhoto(
        plant.photoId,
      );

    if (existing) {
      continue;
    }

    const remote =
      await downloadPhotoFromCloud(
        plant.photoId,
      );

    if (!remote) {
      continue;
    }

    await saveDownloadedPhoto({
      id:
        plant.photoId,

      plantId:
        plant.id,

      blob:
        remote.blob,

      mimeType:
        remote.mimeType,

      width:
        remote.width,

      height:
        remote.height,

      /*
       * Не используем текущее время.
       *
       * Иначе скачанное фото на следующем
       * sync выглядело бы как более новое
       * и снова отправлялось на сервер.
       */
      createdAt:
        remote.updatedAt,
    });
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