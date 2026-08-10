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
          updated_at

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
          updated_at

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
): Promise<void> {
  const existing =
    await getPhotoMetadata(
      env,
      input.userId,
      input.id,
    );

  /*
   * Если сервер уже имеет такую же
   * или более новую версию —
   * ничего не перезаписываем.
   */
  if (
    existing &&
    existing.updated_at >=
      input.updatedAt
  ) {
    return;
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
          updated_at
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
          ?10
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
            excluded.updated_at

        WHERE
          plant_photos.user_id =
            excluded.user_id
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