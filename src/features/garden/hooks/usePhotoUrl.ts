import { useEffect, useState } from "react";
import { getPlantPhoto } from "../repository/gardenRepository";

export function usePhotoUrl(
  photoId: string | null | undefined,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    setUrl(null);

    if (!photoId) {
      return () => {
        active = false;
      };
    }

    void getPlantPhoto(photoId)
      .then(photo => {
        if (!active || !photo) {
          return;
        }

        objectUrl = URL.createObjectURL(photo.blob);
        setUrl(objectUrl);
      })
      .catch(error => {
        console.error(
          "Не удалось загрузить фотографию из IndexedDB:",
          error,
        );
      });

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoId]);

  return url;
}
