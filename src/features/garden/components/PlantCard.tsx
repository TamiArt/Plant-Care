import { motion } from "motion/react";
import { ChevronRight, Droplets, Wind } from "lucide-react";
import { PlantImage, type PlantImageSource } from "../../../shared/components/PlantImage";
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

export function PlantCard({ plant, display, catalogPlant, onWater, onMist, onOpen }: PlantCardProps) {
  const status = getWateringStatus(plant);
  const mistToday = isMistedToday(plant.mistingHistory);
  const urgent = status.color === "red";

  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-3xl border shadow-sm overflow-hidden ${urgent ? "border-red-200" : "border-border"}`}>
      <button onClick={onOpen} className="flex w-full items-stretch text-left">
        <div className="relative flex-shrink-0">
          <PlantImage catalogPlant={catalogPlant} photoId={getLatestPlantPhotoId(plant)} emoji={display.emoji} className="w-24 h-24" />
          {urgent && <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <Droplets size={11} className="text-white" />
          </div>}
        </div>
        <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <p className="font-semibold text-foreground text-sm truncate leading-tight">{plant.nickname}</p>
              <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-muted-foreground italic truncate mb-2">{display.latinName}</p>
          </div>
          <WateringIndicator status={status} interval={plant.wateringInterval} />
        </div>
      </button>
      <div className="flex border-t border-border">
        <button onClick={onWater} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${urgent ? "text-primary bg-primary/5 font-semibold" : "text-muted-foreground hover:text-primary"}`}>
          <Droplets size={14} /> Полить
        </button>
        <div className="w-px bg-border" /><button onClick={onMist} disabled={mistToday}
          aria-label={mistToday ? "Растение опрыснуто сегодня" : "Отметить опрыскивание растения"}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${mistToday ? "text-sky-600 bg-sky-50" : "text-muted-foreground hover:text-sky-600"}`}>
          <Wind size={14} /> {mistToday ? "Опрыснуто ✓" : "Опрыснуть"}
        </button>
      </div>
    </motion.div>
  );
}
