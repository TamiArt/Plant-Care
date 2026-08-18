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
import { getLatestPlantPhotoId } from "../model/photos";
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
  const mistToday = isMistedToday(
    plant.mistingHistory,
  );
  const urgent = status.color === "red";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-3xl border bg-card shadow-sm ${urgent ? "border-red-200" : "border-border"}`}
    >
      <button
        onClick={onOpen}
        className="flex w-full items-stretch text-left"
      >
        <div className="relative flex-shrink-0">
          <PlantImage
            catalogPlant={catalogPlant}
            photoId={getLatestPlantPhotoId(plant)}
            emoji={display.emoji}
            className="h-24 w-24"
          />
          {urgent && (
            <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
              <Droplets
                size={11}
                className="text-white"
              />
            </div>
          )}
        </div>
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
      </button>

      <div className="flex border-t border-border">
        <button
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
              {mistToday
                ? "Опрыснуто ✓"
                : "Опрыснуть"}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
