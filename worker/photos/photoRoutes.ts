import {
  requirePhotoUser,
} from "./photoAuth";

import {
  deletePhoto,
  getOwnedPlant,
  getPhoto,
  MAX_CLOUD_PHOTO_BYTES,
  savePhoto,
} from "./photoRepository";

import type {
  PhotoEnv,
} from "./photoTypes";

function json(
  data: unknown,
  init: ResponseInit = {},
): Response {
  const headers =
    new Headers(
      init.headers,
    );

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

function parsePositiveInteger(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function isSupportedMimeType(
  value: string,
): boolean {
  return (
    value === "image/webp" ||
    value === "image/jpeg"
  );
}

function isValidIsoDate(
  value: string | null,
): value is string {
  return Boolean(
    value &&
    Number.isFinite(
      Date.parse(value),
    ),
  );
}

/**
 * PUT /api/photos/:photoId
 *
 * Binary request body.
 *
 * Required headers:
 *
 * Content-Type
 * X-Plant-Id
 * X-Photo-Width
 * X-Photo-Height
 * X-Photo-Updated-At
 */
export async function handlePutPhoto(
  request: Request,
  env: PhotoEnv,
  photoId: string,
): Promise<Response> {
  const user =
    await requirePhotoUser(
      request,
      env,
    );

  if (!user) {
    return json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const plantId =
    request.headers.get(
      "X-Plant-Id",
    );

  const mimeType =
    request.headers
      .get("Content-Type")
      ?.split(";")[0]
      ?.trim() ??
    "";

  const width =
    parsePositiveInteger(
      request.headers.get(
        "X-Photo-Width",
      ),
    );

  const height =
    parsePositiveInteger(
      request.headers.get(
        "X-Photo-Height",
      ),
    );

  const updatedAt =
    request.headers.get(
      "X-Photo-Updated-At",
    );

  if (!plantId) {
    return json(
      {
        error:
          "Не указан X-Plant-Id.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !isSupportedMimeType(
      mimeType,
    )
  ) {
    return json(
      {
        error:
          "Поддерживаются только WebP и JPEG.",
      },
      {
        status: 415,
      },
    );
  }

  if (
    !width ||
    !height
  ) {
    return json(
      {
        error:
          "Некорректные размеры фотографии.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !isValidIsoDate(
      updatedAt,
    )
  ) {
    return json(
      {
        error:
          "Некорректный X-Photo-Updated-At.",
      },
      {
        status: 400,
      },
    );
  }

  const plant =
    await getOwnedPlant(
      env,
      user.id,
      plantId,
    );

  if (
    !plant ||
    plant.deleted_at !== null
  ) {
    return json(
      {
        error:
          "Растение не найдено.",
      },
      {
        status: 404,
      },
    );
  }

  /*
   * Нельзя загрузить Blob под
   * произвольным photoId.
   *
   * photoId должен совпадать
   * с текущим photo_id растения.
   */
  if (
    plant.photo_id !==
      photoId
  ) {
    return json(
      {
        error:
          "Фотография не принадлежит этому растению.",
      },
      {
        status: 409,
      },
    );
  }

  const contentLength =
    request.headers.get(
      "Content-Length",
    );

  if (
    contentLength &&
    Number(contentLength) >
      MAX_CLOUD_PHOTO_BYTES
  ) {
    return json(
      {
        error:
          "Фотография превышает допустимый размер 400 KiB.",
      },
      {
        status: 413,
      },
    );
  }

  const data =
    await request.arrayBuffer();

  if (
    data.byteLength === 0
  ) {
    return json(
      {
        error:
          "Фотография пустая.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    data.byteLength >
      MAX_CLOUD_PHOTO_BYTES
  ) {
    return json(
      {
        error:
          "Фотография превышает допустимый размер 400 KiB.",
      },
      {
        status: 413,
      },
    );
  }

  await savePhoto(
    env,
    {
      id:
        photoId,

      userId:
        user.id,

      plantId,

      data,

      mimeType,

      width,
      height,

      updatedAt,
    },
  );

  return json({
    ok: true,

    id:
      photoId,

    byteSize:
      data.byteLength,

    updatedAt,
  });
}

/**
 * GET /api/photos/:photoId
 */
export async function handleGetPhoto(
  request: Request,
  env: PhotoEnv,
  photoId: string,
): Promise<Response> {
  const user =
    await requirePhotoUser(
      request,
      env,
    );

  if (!user) {
    return json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const photo =
    await getPhoto(
      env,
      user.id,
      photoId,
    );

  if (!photo) {
    return json(
      {
        error:
          "Фотография не найдена.",
      },
      {
        status: 404,
      },
    );
  }

  /*
   * D1 возвращает BLOB как number[].
   */
  const bytes =
    new Uint8Array(
      photo.photo_blob,
    );

  return new Response(
    bytes,
    {
      status: 200,

      headers: {
        "Content-Type":
          photo.mime_type,

        "Content-Length":
          String(
            photo.byte_size,
          ),

        "Cache-Control":
          "private, no-store",

        "X-Plant-Id":
          photo.plant_id,

        "X-Photo-Width":
          String(
            photo.width,
          ),

        "X-Photo-Height":
          String(
            photo.height,
          ),

        "X-Photo-Updated-At":
          photo.updated_at,
      },
    },
  );
}

/**
 * DELETE /api/photos/:photoId
 *
 * Оставляем endpoint для
 * обслуживания и будущего клиента,
 * хотя основная очистка происходит
 * автоматически SQL trigger-ом.
 */
export async function handleDeletePhoto(
  request: Request,
  env: PhotoEnv,
  photoId: string,
): Promise<Response> {
  const user =
    await requirePhotoUser(
      request,
      env,
    );

  if (!user) {
    return json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  await deletePhoto(
    env,
    user.id,
    photoId,
  );

  return json({
    ok: true,
  });
}