import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, LogIn, Search, SlidersHorizontal } from "lucide-react";

import type { PlantImageSource } from "../../../shared/components/PlantImage";
import {
  filterAndSortPlants,
  type PlantSortMode,
} from "../model/plantList";
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
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] =
    useState<PlantSortMode>("watering");
  const [sortOpen, setSortOpen] =
    useState(false);

  const locationItems = useMemo(
    () =>
      plants
        .filter(
          plant =>
            plant.location === location,
        )
        .map(plant => ({
          plant,
          ...resolvePresentation(plant),
        })),
    [
      location,
      plants,
      resolvePresentation,
    ],
  );

  const overdueCount =
    locationItems.filter(
      item =>
        getWateringStatus(
          item.plant,
        ).color === "red",
    ).length;

  const visibleItems = useMemo(
    () => {
      const presentationById =
        new Map(
          locationItems.map(item => [
            item.plant.id,
            item,
          ]),
        );

      return filterAndSortPlants(
        locationItems.map(item => ({
          plant: item.plant,
          display: item.display,
        })),
        query,
        sortMode,
      ).map(item => ({
        plant: item.plant,
        display: item.display,
        catalogPlant:
          presentationById.get(
            item.plant.id,
          )?.catalogPlant,
      }));
    },
    [
      locationItems,
      query,
      sortMode,
    ],
  );

  const title =
    isHome ? "Дом" : "Сад";
  const emptyEmoji =
    isHome ? "🪴" : "🌳";
  const emptyText = isHome
    ? "Нет комнатных растений"
    : "Нет растений на участке";
  const emptyHint = isHome
    ? "Добавьте цветок или комнатное растение"
    : "Добавьте садовое, огородное или уличное растение";
  const hasSearch =
    query.trim().length > 0;

  return (
    <section className="flex h-full min-h-0 w-full flex-col">
      <header className="shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 pb-3 pt-5 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1
              className="truncate text-2xl font-bold text-foreground sm:text-3xl"
              style={{ fontFamily: "Lora, serif" }}
            >
              {title}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {seasonLabel} · {locationItems.length}{" "}
              {getPlantWord(locationItems.length)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {overdueCount > 0 && (
              <div className="hidden items-center whitespace-nowrap rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 sm:flex">
                💧 {overdueCount} ждут
              </div>
            )}

            <button
              type="button"
              onClick={onOpenData}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95"
              aria-label="Открыть вход и аккаунт"
              title="Вход и аккаунт"
            >
              <LogIn size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {locationItems.length > 0 && (
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-4 sm:px-6 lg:px-8">
            <div className="flex items-stretch gap-2">
              <label className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={query}
                  onChange={event =>
                    setQuery(event.target.value)
                  }
                  placeholder="Найти растение"
                  aria-label="Поиск по моим растениям"
                  className="h-11 w-full rounded-2xl border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
                />
              </label>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setSortOpen(open => !open)
                  }
                  aria-haspopup="menu"
                  aria-expanded={sortOpen}
                  aria-label="Фильтр и сортировка"
                  title="Фильтр и сортировка"
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border bg-card transition-colors ${
                    sortOpen
                      ? "border-primary/50 text-primary"
                      : "border-border text-foreground"
                  }`}
                >
                  <SlidersHorizontal size={18} />
                </button>

                {sortOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Закрыть меню сортировки"
                      onClick={() => setSortOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl"
                    >
                      <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Сортировка
                      </p>
                      <SortOption
                        active={sortMode === "watering"}
                        label="По поливу"
                        hint="Сначала те, кому нужнее вода"
                        onClick={() => {
                          setSortMode("watering");
                          setSortOpen(false);
                        }}
                      />
                      <SortOption
                        active={sortMode === "name"}
                        label="По имени А–Я"
                        hint="По русскому названию"
                        onClick={() => {
                          setSortMode("name");
                          setSortOpen(false);
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {overdueCount > 0 && (
          <div className="px-4 pb-3 sm:hidden">
            <div className="inline-flex items-center rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600">
              💧 Полива ждут: {overdueCount}
            </div>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <AnimatePresence mode="wait">
            {locationItems.length === 0 ? (
              <EmptyState
                key={`empty-${location}`}
                emoji={emptyEmoji}
                title={emptyText}
                hint={emptyHint}
                onGoCatalog={onGoCatalog}
              />
            ) : visibleItems.length === 0 ? (
              <motion.div
                key={`search-empty-${location}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center"
              >
                <Search size={34} className="mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm font-semibold text-foreground">Ничего не найдено</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Попробуйте другое русское, латинское название или прозвище.
                </p>
                {hasSearch && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="mt-4 rounded-xl bg-secondary px-4 py-2 text-xs font-medium text-foreground"
                  >
                    Очистить поиск
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`list-${location}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              >
                {visibleItems.map(item => (
                  <motion.div
                    key={item.plant.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="min-w-0"
                  >
                    <PlantCard
                      plant={item.plant}
                      display={item.display}
                      catalogPlant={item.catalogPlant}
                      onWater={() => onWater(item.plant)}
                      onMist={() => onMist(item.plant.id)}
                      onOpen={() => onOpen(item.plant)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function SortOption({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-secondary"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      {active && <Check size={16} className="mt-0.5 shrink-0 text-primary" />}
    </button>
  );
}

function EmptyState({
  emoji,
  title,
  hint,
  onGoCatalog,
}: {
  emoji: string;
  title: string;
  hint: string;
  onGoCatalog: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-[55vh] flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-secondary text-6xl sm:h-32 sm:w-32 sm:text-7xl" aria-hidden="true">
        {emoji}
      </div>
      <p className="mb-2 text-lg font-semibold text-foreground">{title}</p>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{hint}</p>
      <button
        type="button"
        onClick={onGoCatalog}
        className="mx-auto flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-medium text-primary-foreground shadow-sm transition-transform hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        <BookOpen size={18} />
        Открыть каталог
      </button>
    </motion.div>
  );
}

function getPlantWord(count: number): string {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "растений";
  if (lastDigit === 1) return "растение";
  if (lastDigit >= 2 && lastDigit <= 4) return "растения";
  return "растений";
}
