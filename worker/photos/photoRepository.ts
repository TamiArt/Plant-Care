import type {
  CloudPhotoRow,
  PhotoEnv,
  PhotoMetadataRow,
  PlantOwnershipRow,
} from "./photoTypes";

/**
 * Максимальный размер облачной
 * подготовленной фотографии.
 *
 * 400 KiB.
 *
 * Исходные фотографии могут быть
 * большими — этот лимит относится
 * уже к уменьшенному WebP/JPEG.
 */
export const MAX_CLOUD_PHOTO_BYTES =
  400 * 1024;

export async function getOwnedPlant(
  env: PhotoEnv,
  userId: string,
  plantId: string,
): Promise<
  PlantOwnershipRow | null
> {
  return env.DB
    .prepare(
      `
        SELECT
          id,
          user_id,
          photo_id,
          photo_ids,
          deleted_at

        FROM plants

        WHERE
          id = ?1
          AND user_id = ?2

        LIMIT 1
      `,
    )
    .bind(
      plantId,
      userId,
    )
    .first<PlantOwnershipRow>();
}

export async function getPhotoMetadata(
  env: PhotoEnv,
  userId: string,
  photoId: string,
): Promise<
  PhotoMetadataRow | null
> {
  return env.DB
    .prepare(
      `
        SELECT
          id,
          user_id,
          plant_id,
          mime_type,
          width,
          height,
          byte_size,
          created_at,
          updated_at,
          deleted_at

        FROM plant_photos

        WHERE
          id = ?1
          AND user_id = ?2

        LIMIT 1
      `,
    )
    .bind(
      photoId,
      userId,
    )
    .first<PhotoMetadataRow>();
}

/**
 * Looks up an ID globally so a UUID collision with another user's
 * photo cannot be mistaken for a new photo. Callers must not expose
 * the other user's metadata in API responses.
 */
export type PhotoOwnershipConflict =
  | {
      reason: "photo_id_conflict";
      message: string;
    }
  | {
      reason: "photo_owned_by_another_plant";
      message: string;
      currentPlantId: string;
    };

export function classifyPhotoOwnership(
  existingPhoto: Pick<PhotoMetadataRow, "user_id" | "plant_id"> | null,
  userId: string,
  plantId: string,
): PhotoOwnershipConflict | null {
  if (!existingPhoto) {
    return null;
  }

  // Do not reveal whether another user's photo ID exists or expose its owner.
  if (existingPhoto.user_id !== userId) {
    return {
      reason: "photo_id_conflict",
      message: "Не удалось сохранить фотографию из-за конфликта идентификатора.",
    };
  }

  if (existingPhoto.plant_id !== plantId) {
    return {
      reason: "photo_owned_by_another_plant",
      message: "Фотография уже зарегистрирована за другим растением. Автоматическая перепривязка запрещена.",
      currentPlantId: existingPhoto.plant_id,
    };
  }

  return null;
}

export async function getPhotoMetadataById(
  env: PhotoEnv,
  photoId: string,
): Promise<PhotoMetadataRow | null> {
  return env.DB
    .prepare(
      `
        SELECT
          id,
          user_id,
          plant_id,
          mime_type,
          width,
          height,
          byte_size,
          created_at,
          updated_at,
          deleted_at
        FROM plant_photos
        WHERE id = ?1
        LIMIT 1
      `,
    )
    .bind(photoId)
    .first<PhotoMetadataRow>();
}

export async function getPhoto(
  env: PhotoEnv,
  userId: string,
  photoId: string,
): Promise<
  CloudPhotoRow | null
> {
  return env.DB
    .prepare(
      `
        SELECT
          id,
          user_id,
          plant_id,
          photo_blob,
          mime_type,
          width,
          height,
          byte_size,
          created_at,
          updated_at,
          deleted_at

        FROM plant_photos

        WHERE
          id = ?1
          AND user_id = ?2
          AND deleted_at IS NULL

        LIMIT 1
      `,
    )
    .bind(
      photoId,
      userId,
    )
    .first<CloudPhotoRow>();
}

export async function savePhoto(
  env: PhotoEnv,
  input: {
    id: string;

    userId: string;
    plantId: string;

    data: ArrayBuffer;

    mimeType: string;

    width: number;
    height: number;

    updatedAt: string;
  },
): Promise<"saved" | "unchanged" | "conflict"> {
  const existing =
    await getPhotoMetadataById(
      env,
      input.id,
    );

  if (
    existing &&
    (
      existing.user_id !== input.userId ||
      existing.plant_id !== input.plantId ||
      existing.deleted_at !== null
    )
  ) {
    /*
     * Never revive a tombstoned photo implicitly. A stale local gallery
     * must reconcile its metadata before it can upload this ID again.
     */
    return "conflict";
  }

  /*
   * Если сервер уже имеет такую же
   * или более новую активную версию —
   * ничего не перезаписываем.
   */
  if (
    existing &&
    existing.deleted_at === null &&
    existing.updated_at >=
      input.updatedAt
  ) {
    return "unchanged";
  }

  const createdAt =
    existing?.created_at ??
    input.updatedAt;

  await env.DB
    .prepare(
      `
        INSERT INTO plant_photos (
          id,

          user_id,
          plant_id,

          photo_blob,

          mime_type,

          width,
          height,

          byte_size,

          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          ?1,
          ?2,
          ?3,
          ?4,
          ?5,
          ?6,
          ?7,
          ?8,
          ?9,
          ?10,
          NULL
        )

        ON CONFLICT(id)
        DO UPDATE SET
          plant_id =
            excluded.plant_id,

          photo_blob =
            excluded.photo_blob,

          mime_type =
            excluded.mime_type,

          width =
            excluded.width,

          height =
            excluded.height,

          byte_size =
            excluded.byte_size,

          updated_at =
            excluded.updated_at,

          deleted_at =
            NULL

        WHERE
          plant_photos.user_id =
            excluded.user_id
          AND
          plant_photos.plant_id =
            excluded.plant_id
          AND
          excluded.updated_at >
            plant_photos.updated_at
      `,
    )
    .bind(
      input.id,

      input.userId,
      input.plantId,

      input.data,

      input.mimeType,

      input.width,
      input.height,

      input.data.byteLength,

      createdAt,
      input.updatedAt,
    )
    .run();

  /*
   * The preflight check above is not atomic with INSERT. Re-read the
   * globally unique ID after a no-op write to detect a concurrent
   * insert/ownership change instead of returning a false success.
   */
  const persisted = await getPhotoMetadataById(env, input.id);
  if (
    !persisted ||
    persisted.user_id !== input.userId ||
    persisted.plant_id !== input.plantId ||
    persisted.deleted_at !== null
  ) {
    return "conflict";
  }

  return "saved";
}

export async function deletePhoto(
  env: PhotoEnv,
  userId: string,
  photoId: string,
): Promise<void> {
  await env.DB
    .prepare(
      `
        DELETE FROM plant_photos

        WHERE
          id = ?1
          AND user_id = ?2
      `,
    )
    .bind(
      photoId,
      userId,
    )
    .run();
}
