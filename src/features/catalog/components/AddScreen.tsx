import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Camera,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import {
  preparePhoto,
  type PreparedPhoto,
} from "../../garden";
import { PlantImage } from "../../../shared/components/PlantImage";
import { CATALOG } from "../catalog";
import { filterCatalog } from "../search";
import type { CatalogPlant } from "../types";
import { CATALOG_FILTERS } from "../CatalogScreen";
import { DifficultyBadge } from "./DifficultyBadge";

export interface AddScreenProps {
  onSelectCatalog: (
    plant: CatalogPlant,
    photo: PreparedPhoto | null,
  ) => void;
  onAddCustom: (
    photo: PreparedPhoto | null,
  ) => void;
}

export function AddScreen({
  onSelectCatalog,
  onAddCustom,
}: AddScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] =
    useState<PreparedPhoto | null>(null);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] =
    useState("");
  const [addFilter, setAddFilter] =
    useState<string | null>(null);
  const [isPreparing, setIsPreparing] =
    useState(false);
  const [photoError, setPhotoError] =
    useState("");

  const filteredCatalog = filterCatalog(
    CATALOG,
    catalogQuery,
    addFilter,
  );

  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(photo.blob);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handleFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsPreparing(true);
    setPhotoError("");

    try {
      setPhoto(await preparePhoto(file));
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "Не удалось обработать фотографию.",
      );
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-5 pb-3 pt-5">
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "Lora, serif" }}
        >
          Добавить
        </h1>
        <p className="text-xs text-muted-foreground">
          Добавьте фото или выберите растение из каталога
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-28">
        <div
          onClick={() => {
            if (!isPreparing) {
              fileRef.current?.click();
            }
          }}
          className="relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-primary/25 bg-secondary transition-transform active:scale-[0.98]"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Фото"
                className="h-52 w-full object-cover"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <Camera size={11} />
                Заменить
              </div>
            </div>
          ) : (
            <div className="flex h-52 flex-col items-center justify-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Camera
                  size={28}
                  className="text-primary"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isPreparing
                    ? "Подготовка фотографии…"
                    : "Сфотографируйте растение"}
                </p>
                {!isPreparing && (
                  <p className="text-xs text-muted-foreground">
                    или выберите из галереи
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {photoError && (
          <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">
            {photoError}
          </p>
        )}

        {photo && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">
              Фото подготовлено
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Изображение уменьшено и будет сохранено как Blob
              в IndexedDB после добавления растения.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onAddCustom(photo)}
          disabled={isPreparing}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-secondary p-4 text-left disabled:opacity-50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Plus size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Добавить своё растение
            </p>
            <p className="text-xs text-muted-foreground">
              С фото, описанием — не из каталога
            </p>
          </div>
          <ChevronRight
            size={16}
            className="ml-auto shrink-0 text-muted-foreground"
          />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            каталог растений
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div>
          <div className="relative mb-2">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={catalogQuery}
              onChange={event =>
                setCatalogQuery(event.target.value)
              }
              placeholder="Поиск по каталогу..."
              className="w-full rounded-2xl bg-muted py-3 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
            {CATALOG_FILTERS.map(filter => (
              <button
                type="button"
                key={filter.label}
                onClick={() =>
                  setAddFilter(filter.tag)
                }
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  addFilter === filter.tag
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredCatalog.map(plant => (
              <button
                type="button"
                key={plant.id}
                onClick={() =>
                  onSelectCatalog(plant, photo)
                }
                disabled={isPreparing}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors active:bg-secondary disabled:opacity-50"
              >
                <PlantImage
                  catalogPlant={plant}
                  className="h-12 w-12 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {plant.name}
                  </p>
                  <p className="mb-1 truncate text-xs italic text-muted-foreground">
                    {plant.latinName}
                  </p>
                  <DifficultyBadge
                    value={plant.difficulty}
                  />
                </div>
                <ChevronRight
                  size={15}
                  className="shrink-0 text-muted-foreground"
                />
              </button>
            ))}

            {filteredCatalog.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
