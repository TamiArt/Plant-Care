import type {
  PreparedPhoto,
} from "./preparePhoto";

const MAX_CLOUD_PHOTO_BYTES =
  400 * 1024;

const MIN_QUALITY = 0.5;

const QUALITY_STEP = 0.06;

const MIN_LONG_SIDE = 900;

const RESIZE_FACTOR = 0.88;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(
      blob => resolve(blob),
      mimeType,
      quality,
    );
  });
}

async function blobToImageBitmap(
  blob: Blob,
): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function drawScaledCanvas(
  bitmap: ImageBitmap,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const canvas =
    document.createElement("canvas");

  canvas.width =
    targetWidth;

  canvas.height =
    targetHeight;

  const context =
    canvas.getContext("2d", {
      alpha: false,
    });

  if (!context) {
    throw new Error(
      "Не удалось подготовить фотографию для облака.",
    );
  }

  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    targetWidth,
    targetHeight,
  );

  context.imageSmoothingEnabled =
    true;

  context.imageSmoothingQuality =
    "high";

  context.drawImage(
    bitmap,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return canvas;
}

function calculateScaledSize(
  width: number,
  height: number,
  scale: number,
): {
  width: number;
  height: number;
} {
  return {
    width:
      Math.max(
        1,
        Math.round(
          width * scale,
        ),
      ),

    height:
      Math.max(
        1,
        Math.round(
          height * scale,
        ),
      ),
  };
}

async function tryEncode(
  canvas: HTMLCanvasElement,
  mimeType:
    | "image/webp"
    | "image/jpeg",
  quality: number,
): Promise<Blob | null> {
  const blob =
    await canvasToBlob(
      canvas,
      mimeType,
      quality,
    );

  if (
    !blob ||
    blob.size === 0
  ) {
    return null;
  }

  return blob;
}

export async function compressPhotoForCloud(
  photo: PreparedPhoto,
): Promise<PreparedPhoto> {
  if (
    photo.blob.size <=
      MAX_CLOUD_PHOTO_BYTES
  ) {
    return photo;
  }

  const bitmap =
    await blobToImageBitmap(
      photo.blob,
    );

  try {
    let width =
      photo.width;

    let height =
      photo.height;

    let quality =
      photo.mimeType ===
      "image/webp"
        ? 0.76
        : 0.8;

    while (true) {
      const canvas =
        drawScaledCanvas(
          bitmap,
          width,
          height,
        );

      const encoded =
        await tryEncode(
          canvas,
          photo.mimeType,
          quality,
        );

      if (
        encoded &&
        encoded.size <=
          MAX_CLOUD_PHOTO_BYTES
      ) {
        return {
          blob:
            encoded,

          width,

          height,

          mimeType:
            photo.mimeType,
        };
      }

      if (
        quality >
          MIN_QUALITY
      ) {
        quality =
          Math.max(
            MIN_QUALITY,
            quality -
              QUALITY_STEP,
          );

        continue;
      }

      const longestSide =
        Math.max(
          width,
          height,
        );

      if (
        longestSide <=
          MIN_LONG_SIDE
      ) {
        break;
      }

      const scaled =
        calculateScaledSize(
          width,
          height,
          RESIZE_FACTOR,
        );

      width =
        scaled.width;

      height =
        scaled.height;

      quality =
        photo.mimeType ===
        "image/webp"
          ? 0.7
          : 0.76;
    }

    throw new Error(
      "Не удалось уменьшить фотографию до допустимого размера для синхронизации.",
    );
  } finally {
    bitmap.close();
  }
}

export function isCloudPhotoSizeAllowed(
  blob: Blob,
): boolean {
  return (
    blob.size <=
    MAX_CLOUD_PHOTO_BYTES
  );
}

export {
  MAX_CLOUD_PHOTO_BYTES,
};