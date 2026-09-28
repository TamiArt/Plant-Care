import { useEffect, useState } from "react";
import { PlantImage, type PlantImageSource } from "../../../shared/components/PlantImage";

export interface PlantPhotoGalleryProps {
  photoIds: string[];
  primaryPhotoId?: string | null;
  catalogPlant?: PlantImageSource | null;
  emoji: string;
  className?: string;
  onEmptyClick?: () => void;
  onPhotoClick?: () => void;
  enableViewer?: boolean;
}

export function PlantPhotoGallery({
  photoIds,
  primaryPhotoId,
  catalogPlant,
  emoji,
  className = "",
  onEmptyClick,
  onPhotoClick,
  enableViewer = true,
}: PlantPhotoGalleryProps) {
  const safePhotoIds = Array.isArray(photoIds)
    ? photoIds.filter(Boolean)
    : [];
  const orderedPhotoIds = primaryPhotoId &&
    safePhotoIds.includes(primaryPhotoId)
      ? [
          primaryPhotoId,
          ...safePhotoIds.filter(
            id => id !== primaryPhotoId,
          ),
        ]
      : safePhotoIds;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!enableViewer || viewerIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerIndex(null);
      if (orderedPhotoIds.length < 2) return;

      if (event.key === "ArrowLeft") {
        setViewerIndex(current =>
          current === null
            ? null
            : (current - 1 + orderedPhotoIds.length) % orderedPhotoIds.length,
        );
      }

      if (event.key === "ArrowRight") {
        setViewerIndex(current =>
          current === null
            ? null
            : (current + 1) % orderedPhotoIds.length,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableViewer, viewerIndex, orderedPhotoIds.length]);

  useEffect(() => {
    if (
      viewerIndex !== null &&
      (!enableViewer ||
        viewerIndex < 0 ||
        viewerIndex >= orderedPhotoIds.length)
    ) {
      setViewerIndex(null);
    }
  }, [enableViewer, viewerIndex, orderedPhotoIds.length]);

  const count = orderedPhotoIds.length;

  const handlePhotoClick = (index: number) => {
    if (enableViewer) {
      setViewerIndex(index);
      return;
    }

    onPhotoClick?.();
  };

  return (
    <>
      <div
        className={`relative h-24 w-24 flex-shrink-0 overflow-hidden bg-secondary ${className}`}
        onClick={event => event.stopPropagation()}
      >
        {count === 0 ? (
          <button
            type="button"
            onClick={onEmptyClick}
            aria-label="Открыть растение"
            className="h-full w-full"
          >
            <PlantImage
              catalogPlant={catalogPlant}
              emoji={emoji}
              className="h-full w-full"
            />
          </button>
        ) : (
          <div
            className={
              count === 1
                ? "grid h-full w-full"
                : count === 2
                  ? "grid h-full w-full grid-cols-2 gap-px"
                  : "grid h-full w-full grid-cols-2 grid-rows-2 gap-px"
            }
          >
            {orderedPhotoIds.slice(0, 4).map((photoId, index) => (
              <button
                key={photoId}
                type="button"
                onClick={() => handlePhotoClick(index)}
                aria-label={
                  enableViewer
                    ? `Открыть фото ${index + 1} из ${count}`
                    : "Открыть карточку растения"
                }
                className={
                  count >= 3 && index === 0
                    ? "relative min-h-0 min-w-0 row-span-2 overflow-hidden"
                    : "relative min-h-0 min-w-0 overflow-hidden"
                }
              >
                <PlantImage
                  photoId={photoId}
                  className="h-full w-full"
                />
              </button>
            ))}
          </div>
        )}

        {count > 1 && (
          <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            {count}
          </span>
        )}
      </div>

      {enableViewer && viewerIndex !== null && orderedPhotoIds[viewerIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фотографий растения"
          onClick={() => setViewerIndex(null)}
        >
          <button
            type="button"
            aria-label="Закрыть просмотр"
            onClick={() => setViewerIndex(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur"
          >
            ×
          </button>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Предыдущее фото"
                onClick={event => {
                  event.stopPropagation();
                  setViewerIndex((viewerIndex - 1 + count) % count);
                }}
                className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Следующее фото"
                onClick={event => {
                  event.stopPropagation();
                  setViewerIndex((viewerIndex + 1) % count);
                }}
                className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur"
              >
                ›
              </button>
            </>
          )}

          <div
            className="max-h-full max-w-full"
            onClick={event => event.stopPropagation()}
          >
            <PlantImage
              photoId={orderedPhotoIds[viewerIndex]}
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
            />
            {count > 1 && (
              <p className="mt-2 text-center text-xs text-white/70">
                {viewerIndex + 1} / {count}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
