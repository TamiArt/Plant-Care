import {
  useEffect,
  useState,
} from "react";
import { usePhotoUrl } from "../../features/garden/hooks/usePhotoUrl";

export interface PlantImageSource {
  name: string;
  emoji: string;
  unsplashId: string;
}

export interface PlantImageProps {
  catalogPlant?: PlantImageSource | null;
  photoId?: string | null;
  previewUrl?: string | null;
  emoji?: string;
  className?: string;
}

export function PlantImage({
  catalogPlant,
  photoId = null,
  previewUrl = null,
  emoji,
  className = "",
}: PlantImageProps) {
  const storedPhotoUrl = usePhotoUrl(photoId);
  const [failedSource, setFailedSource] =
    useState<string | null>(null);

  const userPhoto = previewUrl ?? storedPhotoUrl;
  const fallbackEmoji =
    emoji || catalogPlant?.emoji || "🌿";

  useEffect(() => {
    setFailedSource(null);
  }, [userPhoto, catalogPlant?.unsplashId]);

  if (
    userPhoto &&
    failedSource !== userPhoto
  ) {
    return (
      <img
        src={userPhoto}
        alt=""
        className={`object-cover bg-secondary ${className}`}
        onError={() => setFailedSource(userPhoto)}
      />
    );
  }

  if (catalogPlant?.unsplashId) {
    const source =
      `https://images.unsplash.com/${catalogPlant.unsplashId}` +
      "?w=600&h=600&fit=crop&auto=format";

    if (failedSource !== source) {
      return (
        <img
          src={source}
          alt={catalogPlant.name}
          className={`object-cover bg-secondary ${className}`}
          onError={() => setFailedSource(source)}
        />
      );
    }
  }

  return (
    <div
      className={`flex items-center justify-center bg-secondary text-4xl ${className}`}
    >
      {fallbackEmoji}
    </div>
  );
}
