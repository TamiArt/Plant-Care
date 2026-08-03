import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Database } from "lucide-react";
import type { PlantImageSource } from "../../../shared/components/PlantImage";
import { getWateringStatus } from "../model/watering";
import type { PlantDisplay, PlantLocation, UserPlant } from "../types";
import { PlantCard } from "./PlantCard";

export interface PlantPresentation {
  display: PlantDisplay;
  catalogPlant?: PlantImageSource | null;
}

export interface PlantsScreenProps {
  location: PlantLocation;
  plants: UserPlant[];
  seasonLabel: string;
  resolvePresentation: (plant: UserPlant) => PlantPresentation;
  onWater: (plant: UserPlant) => void;
  onMist: (id: string) => void;
  onOpen: (plant: UserPlant) => void;
  onGoCatalog: () => void;
  onOpenData: () => void;
}

export function PlantsScreen({
  location, plants, seasonLabel, resolvePresentation,
  onWater, onMist, onOpen, onGoCatalog, onOpenData,
}: PlantsScreenProps) {
  const isHome = location === "home";
  const visible = plants.filter(plant => plant.location === location);
  const overdue = visible.filter(plant => getWateringStatus(plant).color === "red").length;
  const sorted = [...visible].sort((a, b) => getWateringStatus(b).urgency - getWateringStatus(a).urgency);
  const title = isHome ? "Дом" : "Сад";
  const emptyEmoji = isHome ? "🪴" : "🌳";
  const emptyText = isHome ? "Нет комнатных растений" : "Нет растений на участке";
  const emptyHint = isHome ? "Добавьте цветок или комнатное растение" : "Добавьте садовое, огородное или уличное растение";

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>{title}</h1>
            <p className="text-xs text-muted-foreground">{seasonLabel} · {visible.length} растений</p>
          </div>
          <div className="flex items-center gap-2">
            {overdue > 0 && <div className="bg-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full">💧 {overdue} ждут</div>}
            <button onClick={onOpenData} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" title="Данные и резервная копия">
              <Database size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <AnimatePresence mode="wait">
          {sorted.length === 0 ? (
            <motion.div key={`empty-${location}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-7xl mb-4">{emptyEmoji}</div>
              <p className="text-base font-semibold text-foreground mb-1">{emptyText}</p>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{emptyHint}</p>
              <button onClick={onGoCatalog} className="bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl font-medium flex items-center gap-2 mx-auto">
                <BookOpen size={18} /> Открыть каталог
              </button>
            </motion.div>
          ) : (
            <motion.div key={`list-${location}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {sorted.map(plant => {
                const presentation = resolvePresentation(plant);
                return <PlantCard key={plant.id} plant={plant} {...presentation}
                  onWater={() => onWater(plant)} onMist={() => onMist(plant.id)} onOpen={() => onOpen(plant)} />;
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
