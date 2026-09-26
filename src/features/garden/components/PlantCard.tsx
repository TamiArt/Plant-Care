import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ChevronRight,
  Droplets,
  Wind,
} from "lucide-react";
import {
  PlantImage,
  type PlantImageSource,
} from "../../../shared/components/PlantImage";
import {
  isMistingEnabled,
} from "../model/carePreferences";
import { isMistedToday } from "../model/misting";
import { getPlantPhotoIds } from "../model/photos";
import { getWateringStatus } from "../model/watering";
import type { PlantDisplay, UserPlant } from "../types";
import { WateringIndicator } from "./WateringIndicator";

export interface PlantCardProps {
  plant: UserPlant;
  display: PlantDisplay;
  catalogPlant?: PlantImageSource | null;
  onWater: () => void;
  onMist: () => void;
  onOpen: () => void;
}

function PlantPhotoGrid({
  photoIds,
  catalogPlant,
  emoji,
  onOpen,
}: {
  photoIds: string[];
  catalogPlant?: PlantImageSource | null;
  emoji: string;
  onOpen: () => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (viewerIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerIndex(null);
      if (event.key === "ArrowLeft") {
        setViewerIndex(current =>
          current === null
            ? null
            : (current - 1 + photoIds.length) % photoIds.length,
        );
      }
      if (event.key === "ArrowRight") {
        setViewerIndex(current =>
          current === null
            ? null
            : (current + 1) % photoIds.length,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerIndex, photoIds.length]);

  const hasPhotos = photoIds.length > 0;

  return (
    <>
      <div
        className="relative h-24 w-24 flex-shrink-0 overflow-hidden bg-secondary"
        onClick={event => event.stopPropagation()}
      >
        {hasPhotos ? (
          <div
            className={
              photoIds.length === 1
                ? "grid h-full w-full"
                : photoIds.length === 2
                  ? "grid h-full w-full grid-cols-2 gap-px"
                  : "grid h-full w-full grid-cols-2 grid-rows-2 gap-px"
            }
          >
            {photoIds.map((photoId, index) => (
              <button
                key={photoId}
                type="button"
                aria-label={`Открыть фото ${index + 1} из ${photoIds.length}`}
                onClick={() => setViewerIndex(index)}
                className={
                  photoIds.length === 3 && index === 0
                    ? "relative min-h-0 min-w-0 row-span-2 overflow-hidden"
                    : "relative min-h-0 min-w-0 overflow-hidden"
                }
              >
                <PlantImage
                  photoId={photoId}
                  catalogPlant={catalogPlant}
                  emoji={emoji}
                  className="h-full w-full"
                />
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            aria-label="Открыть растение"
            className="h-full w-full"
          >
            <PlantImage
              catalogPlant={catalogPlant}
              emoji={emoji}
              className="h-full w-full"
            />
          </button>
        )}

        {hasPhotos && photoIds.length > 1 && (
          <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            {photoIds.length}
          </span>
        )}
      </div>

      {viewerIndex !== null && photoIds[viewerIndex] && (
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

          {photoIds.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Предыдущее фото"
                onClick={event => {
                  event.stopPropagation();
                  setViewerIndex(
                    (viewerIndex - 1 + photoIds.length) % photoIds.length,
                  );
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
                  setViewerIndex((viewerIndex + 1) % photoIds.length);
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
              photoId={photoIds[viewerIndex]}
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
            />
            {photoIds.length > 1 && (
              <p className="mt-2 text-center text-xs text-white/70">
                {viewerIndex + 1} / {photoIds.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function PlantCard({
  plant,
  display,
  catalogPlant,
  onWater,
  onMist,
  onOpen,
}: PlantCardProps) {
  const status = getWateringStatus(plant);
  const mistingEnabled = isMistingEnabled(plant);
  const mistToday = isMistedToday(plant.mistingHistory);
  const urgent = status.color === "red";
  const photoIds = getPlantPhotoIds(plant);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-3xl border bg-card shadow-sm ${urgent ? "border-red-200" : "border-border"}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        className="flex w-full items-stretch text-left"
      >
        <PlantPhotoGrid
          photoIds={photoIds}
          catalogPlant={catalogPlant}
          emoji={display.emoji}
          onOpen={onOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
          <div>
            <div className="mb-0.5 flex items-start justify-between gap-1">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {plant.nickname}
              </p>
              <ChevronRight
                size={14}
                className="mt-0.5 flex-shrink-0 text-muted-foreground"
              />
            </div>
            <p className="mb-2 truncate text-xs italic text-muted-foreground">
              {display.latinName}
            </p>
          </div>
          <WateringIndicator
            status={status}
            interval={plant.wateringInterval}
          />
        </div>
      </div>

      <div className="flex border-t border-border">
        <button
          type="button"
          onClick={onWater}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${urgent ? "bg-primary/5 font-semibold text-primary" : "text-muted-foreground hover:text-primary"}`}
        >
          <Droplets size={14} />
          Полить
        </button>

        {mistingEnabled && (
          <>
            <div className="w-px bg-border" />
            <button
              type="button"
              onClick={onMist}
              disabled={mistToday}
              aria-label={
                mistToday
                  ? "Растение опрыснуто сегодня"
                  : "Отметить опрыскивание растения"
              }
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${mistToday ? "bg-sky-50 text-sky-600" : "text-muted-foreground hover:text-sky-600"}`}
            >
              <Wind size={14} />
              {mistToday ? "Опрыснуто ✓" : "Опрыснуть"}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
