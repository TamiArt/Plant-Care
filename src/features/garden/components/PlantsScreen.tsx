import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Database } from "lucide-react";

import type { PlantImageSource } from "../../../shared/components/PlantImage";
import { getWateringStatus } from "../model/watering";
import type {
  PlantDisplay,
  PlantLocation,
  UserPlant,
} from "../types";
import { PlantCard } from "./PlantCard";

export interface PlantPresentation {
  display: PlantDisplay;
  catalogPlant?: PlantImageSource | null;
}

export interface PlantsScreenProps {
  location: PlantLocation;
  plants: UserPlant[];
  seasonLabel: string;
  resolvePresentation: (
    plant: UserPlant,
  ) => PlantPresentation;
  onWater: (plant: UserPlant) => void;
  onMist: (id: string) => void;
  onOpen: (plant: UserPlant) => void;
  onGoCatalog: () => void;
  onOpenData: () => void;
}

interface PlantWithStatus {
  plant: UserPlant;
  urgency: number;
  isOverdue: boolean;
}

export function PlantsScreen({
  location,
  plants,
  seasonLabel,
  resolvePresentation,
  onWater,
  onMist,
  onOpen,
  onGoCatalog,
  onOpenData,
}: PlantsScreenProps) {
  const isHome = location === "home";

  /*
   * Вычисляем статус полива один раз для каждого растения.
   * В старом варианте getWateringStatus вызывался несколько раз.
   */
  const plantsWithStatus: PlantWithStatus[] = plants
    .filter(plant => plant.location === location)
    .map(plant => {
      const status = getWateringStatus(plant);

      return {
        plant,
        urgency: status.urgency,
        isOverdue: status.color === "red",
      };
    });

  const overdueCount = plantsWithStatus.filter(
    item => item.isOverdue,
  ).length;

  const sortedPlants = [...plantsWithStatus]
    .sort((first, second) => {
      return second.urgency - first.urgency;
    })
    .map(item => item.plant);

  const title = isHome ? "Дом" : "Сад";
  const emptyEmoji = isHome ? "🪴" : "🌳";

  const emptyText = isHome
    ? "Нет комнатных растений"
    : "Нет растений на участке";

  const emptyHint = isHome
    ? "Добавьте цветок или комнатное растение"
    : "Добавьте садовое, огородное или уличное растение";

  return (
    <section className="flex h-full min-h-0 w-full flex-col">
      {/* Заголовок экрана */}
      <header className="shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div
          className="
            mx-auto
            flex
            w-full
            max-w-[1600px]
            items-center
            justify-between
            gap-4
            px-4
            pb-4
            pt-5
            sm:px-6
            lg:px-8
          "
        >
          <div className="min-w-0">
            <h1
              className="
                truncate
                text-2xl
                font-bold
                text-foreground
                sm:text-3xl
              "
              style={{
                fontFamily: "Lora, serif",
              }}
            >
              {title}
            </h1>

            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {seasonLabel} · {sortedPlants.length}{" "}
              {getPlantWord(sortedPlants.length)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {overdueCount > 0 && (
              <div
                className="
                  hidden
                  items-center
                  whitespace-nowrap
                  rounded-full
                  bg-red-100
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-red-600
                  sm:flex
                "
              >
                💧 {overdueCount} ждут
              </div>
            )}

            <button
              type="button"
              onClick={onOpenData}
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-secondary
                text-muted-foreground
                transition-colors
                hover:bg-primary/10
                hover:text-primary
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary
                focus-visible:ring-offset-2
                active:scale-95
              "
              aria-label="Открыть данные и резервную копию"
              title="Данные и резервная копия"
            >
              <Database size={17} />
            </button>
          </div>
        </div>

        {/* На телефоне показываем статус отдельной строкой */}
        {overdueCount > 0 && (
          <div className="px-4 pb-3 sm:hidden">
            <div
              className="
                inline-flex
                items-center
                rounded-full
                bg-red-100
                px-3
                py-1.5
                text-xs
                font-semibold
                text-red-600
              "
            >
              💧 Полива ждут: {overdueCount}
            </div>
          </div>
        )}
      </header>

      {/* Прокручиваемая область */}
      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overscroll-contain
          px-4
          pb-28
          pt-4
          sm:px-6
          sm:pt-5
          lg:px-8
        "
      >
        <div className="mx-auto w-full max-w-[1600px]">
          <AnimatePresence mode="wait">
            {sortedPlants.length === 0 ? (
              <motion.div
                key={`empty-${location}`}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.2,
                }}
                className="
                  flex
                  min-h-[55vh]
                  flex-col
                  items-center
                  justify-center
                  px-4
                  py-16
                  text-center
                "
              >
                <div
                  className="
                    mb-5
                    flex
                    h-28
                    w-28
                    items-center
                    justify-center
                    rounded-full
                    bg-secondary
                    text-6xl
                    sm:h-32
                    sm:w-32
                    sm:text-7xl
                  "
                  aria-hidden="true"
                >
                  {emptyEmoji}
                </div>

                <p className="mb-2 text-lg font-semibold text-foreground">
                  {emptyText}
                </p>

                <p
                  className="
                    mb-8
                    max-w-md
                    text-sm
                    leading-relaxed
                    text-muted-foreground
                    sm:text-base
                  "
                >
                  {emptyHint}
                </p>

                <button
                  type="button"
                  onClick={onGoCatalog}
                  className="
                    mx-auto
                    flex
                    items-center
                    gap-2
                    rounded-2xl
                    bg-primary
                    px-6
                    py-3.5
                    font-medium
                    text-primary-foreground
                    shadow-sm
                    transition-transform
                    hover:opacity-95
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-primary
                    focus-visible:ring-offset-2
                    active:scale-[0.98]
                  "
                >
                  <BookOpen size={18} />
                  Открыть каталог
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={`list-${location}`}
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.2,
                }}
                className="
                  grid
                  grid-cols-1
                  items-start
                  gap-3
                  sm:grid-cols-2
                  sm:gap-4
                  lg:grid-cols-3
                  xl:grid-cols-4
                  2xl:grid-cols-5
                "
              >
                {sortedPlants.map(plant => {
                  const presentation =
                    resolvePresentation(plant);

                  return (
                    <motion.div
                      key={plant.id}
                      layout
                      initial={{
                        opacity: 0,
                        y: 8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.98,
                      }}
                      transition={{
                        duration: 0.18,
                      }}
                      className="min-w-0"
                    >
                      <PlantCard
                        plant={plant}
                        {...presentation}
                        onWater={() => onWater(plant)}
                        onMist={() => onMist(plant.id)}
                        onOpen={() => onOpen(plant)}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/**
 * Корректное склонение количества растений.
 *
 * 1 растение
 * 2 растения
 * 5 растений
 * 21 растение
 */
function getPlantWord(count: number): string {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (
    lastTwoDigits >= 11 &&
    lastTwoDigits <= 14
  ) {
    return "растений";
  }

  if (lastDigit === 1) {
    return "растение";
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4
  ) {
    return "растения";
  }

  return "растений";
}