/**
 * Результат подготовки фотографии.
 *
 * Blob хранится в IndexedDB.
 * В JSON и UserPlant бинарные данные попадать не должны.
 */
export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
  mimeType: "image/webp" | "image/jpeg";
}

/**
 * Максимальный размер исходного файла — 20 МБ.
 *
 * Это ограничивает чрезмерное потребление памяти
 * при обработке фотографии на мобильном устройстве.
 */
const MAX_SOURCE_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Максимальная сторона готовой фотографии.
 */
const MAX_IMAGE_SIDE = 1280;

/**
 * Качество WebP.
 */
const WEBP_QUALITY = 0.78;

/**
 * Качество JPEG, если браузер не смог создать WebP.
 */
const JPEG_QUALITY = 0.82;

/**
 * Преобразует canvas в Blob.
 */
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

/**
 * Проверяет, что браузер умеет декодировать изображение
 * через createImageBitmap.
 */
function supportsCreateImageBitmap(): boolean {
  return typeof createImageBitmap === "function";
}

/**
 * Загружает изображение через обычный HTMLImageElement.
 *
 * Это запасной вариант для браузеров, в которых
 * createImageBitmap недоступен или завершился ошибкой.
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      reject(
        new Error(
          "Браузер не смог открыть выбранную фотографию.",
        ),
      );
    };

    image.src = objectUrl;
  });
}

/**
 * Рассчитывает размер изображения с сохранением пропорций.
 *
 * Маленькие изображения не увеличиваются.
 */
function calculateTargetSize(
  sourceWidth: number,
  sourceHeight: number,
): {
  width: number;
  height: number;
} {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error(
      "Фотография имеет некорректные размеры.",
    );
  }

  const longestSide = Math.max(
    sourceWidth,
    sourceHeight,
  );

  const scale = Math.min(
    1,
    MAX_IMAGE_SIDE / longestSide,
  );

  return {
    width: Math.max(
      1,
      Math.round(sourceWidth * scale),
    ),
    height: Math.max(
      1,
      Math.round(sourceHeight * scale),
    ),
  };
}

/**
 * Рисует изображение в canvas.
 */
function drawToCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
} {
  const { width, height } = calculateTargetSize(
    sourceWidth,
    sourceHeight,
  );

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    throw new Error(
      "Браузер не смог подготовить область обработки фотографии.",
    );
  }

  /*
   * Белый фон нужен на случай изображения с прозрачностью,
   * которое будет сохранено как JPEG.
   */
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    source,
    0,
    0,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );

  return {
    canvas,
    width,
    height,
  };
}

/**
 * Кодирует canvas сначала в WebP.
 *
 * Если браузер не поддерживает создание WebP,
 * используется JPEG.
 */
async function encodeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<PreparedPhoto> {
  const webpBlob = await canvasToBlob(
    canvas,
    "image/webp",
    WEBP_QUALITY,
  );

  if (
    webpBlob &&
    webpBlob.size > 0 &&
    webpBlob.type === "image/webp"
  ) {
    return {
      blob: webpBlob,
      width,
      height,
      mimeType: "image/webp",
    };
  }

  const jpegBlob = await canvasToBlob(
    canvas,
    "image/jpeg",
    JPEG_QUALITY,
  );

  if (!jpegBlob || jpegBlob.size === 0) {
    throw new Error(
      "Не удалось преобразовать фотографию.",
    );
  }

  return {
    blob: jpegBlob,
    width,
    height,
    mimeType: "image/jpeg",
  };
}

/**
 * Подготавливает выбранную фотографию для IndexedDB.
 *
 * Выполняет:
 * 1. проверку типа;
 * 2. проверку размера;
 * 3. декодирование изображения;
 * 4. уменьшение до 1280 px;
 * 5. кодирование в WebP;
 * 6. fallback в JPEG.
 */
export async function preparePhoto(
  file: File,
): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error(
      "Выбранный файл не является изображением.",
    );
  }

  if (file.size === 0) {
    throw new Error(
      "Выбранный файл пуст.",
    );
  }

  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new Error(
      "Фотография слишком большая. Максимальный размер исходного файла — 20 МБ.",
    );
  }

  /*
   * Основной вариант.
   *
   * imageOrientation: "from-image" учитывает EXIF-ориентацию
   * камеры там, где браузер это поддерживает.
   */
  if (supportsCreateImageBitmap()) {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });

      try {
        const {
          canvas,
          width,
          height,
        } = drawToCanvas(
          bitmap,
          bitmap.width,
          bitmap.height,
        );

        return await encodeCanvas(
          canvas,
          width,
          height,
        );
      } finally {
        bitmap.close();
      }
    } catch {
      /*
       * Переходим к HTMLImageElement.
       * Это важно для несовместимых форматов и старых браузеров.
       */
    }
  }

  const image = await loadImageElement(file);

  const {
    canvas,
    width,
    height,
  } = drawToCanvas(
    image,
    image.naturalWidth,
    image.naturalHeight,
  );

  return encodeCanvas(
    canvas,
    width,
    height,
  );
}

/**
 * Создаёт временный URL для предпросмотра Blob.
 *
 * Этот URL нельзя сохранять в IndexedDB или JSON.
 * После использования обязательно вызвать URL.revokeObjectURL().
 */
export function createPhotoPreviewUrl(
  photo: PreparedPhoto,
): string {
  return URL.createObjectURL(photo.blob);
}

/**
 * Конвертирует старый Data URL из localStorage в File.
 *
 * Функция понадобится при одноразовой миграции старых фотографий.
 */
export async function dataUrlToFile(
  dataUrl: string,
  fileName = "legacy-photo",
): Promise<File> {
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error(
      "Строка не является фотографией в формате Data URL.",
    );
  }

  const response = await fetch(dataUrl);

  if (!response.ok) {
    throw new Error(
      "Не удалось прочитать старую фотографию.",
    );
  }

  const blob = await response.blob();

  return new File(
    [blob],
    fileName,
    {
      type: blob.type || "image/jpeg",
    },
  );
}