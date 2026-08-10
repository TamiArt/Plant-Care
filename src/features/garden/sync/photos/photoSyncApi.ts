import type {
  PlantPhoto,
} from "../../types";

/**
 * Same-origin API.
 *
 * Development:
 * /api -> Vite -> localhost:8787
 *
 * Production:
 * /api -> Vercel -> Cloudflare Worker
 */
const API_BASE_URL =
  "/api";

export interface RemotePhoto {
  blob: Blob;

  mimeType: string;

  width: number;

  height: number;

  updatedAt: string;
}

async function readError(
  response: Response,
): Promise<string> {
  try {
    const data =
      await response.json() as {
        error?: unknown;
      };

    if (
      typeof data.error ===
        "string"
    ) {
      return data.error;
    }
  } catch {
    // Ignore parse failure.
  }

  return `HTTP ${response.status}`;
}

export async function uploadPhotoToCloud(
  photo: PlantPhoto,
  updatedAt: string,
): Promise<void> {
  const response =
    await fetch(
      `${API_BASE_URL}/photos/${encodeURIComponent(
        photo.id,
      )}`,
      {
        method: "PUT",

        credentials:
          "include",

        headers: {
          "Content-Type":
            photo.mimeType,

          "X-Plant-Id":
            photo.plantId,

          "X-Photo-Width":
            String(
              photo.width,
            ),

          "X-Photo-Height":
            String(
              photo.height,
            ),

          "X-Photo-Updated-At":
            updatedAt,
        },

        body:
          photo.blob,
      },
    );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
      ),
    );
  }
}

export async function downloadPhotoFromCloud(
  photoId: string,
): Promise<RemotePhoto | null> {
  const response =
    await fetch(
      `${API_BASE_URL}/photos/${encodeURIComponent(
        photoId,
      )}`,
      {
        method: "GET",

        credentials:
          "include",
      },
    );

  if (
    response.status ===
      404
  ) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
      ),
    );
  }

  const width =
    Number(
      response.headers.get(
        "X-Photo-Width",
      ),
    );

  const height =
    Number(
      response.headers.get(
        "X-Photo-Height",
      ),
    );

  const updatedAt =
    response.headers.get(
      "X-Photo-Updated-At",
    );

  const mimeType =
    response.headers
      .get("Content-Type")
      ?.split(";")[0]
      ?.trim();

  if (
    !Number.isFinite(
      width,
    ) ||
    width <= 0 ||
    !Number.isFinite(
      height,
    ) ||
    height <= 0 ||
    !updatedAt ||
    !mimeType
  ) {
    throw new Error(
      "Сервер вернул некорректные метаданные фотографии.",
    );
  }

  const blob =
    await response.blob();

  return {
    blob,
    mimeType,
    width,
    height,
    updatedAt,
  };
}