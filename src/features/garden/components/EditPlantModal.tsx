import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { motion } from "motion/react";
import {
  ImagePlus,
  Lightbulb,
  Wind,
  X,
} from "lucide-react";
import {
  PlantImage,
  type PlantImageSource,
} from "../../../shared/components/PlantImage";
import {
  isMistingEnabled,
} from "../model/carePreferences";
import { replaceLastWateringDate } from "../model/watering";
import {
  preparePhoto,
  type PreparedPhoto,
} from "../services/preparePhoto";
import type { UserPlant } from "../types";
import { getPlantPhoto } from "../repository/gardenRepository";
import { getPlantPhotoIds, MAX_PLANT_PHOTOS } from "../model/photos";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export interface EditPlantSaveData {
  changes: Partial<UserPlant>;
  photo: PreparedPhoto | null;
  removePhoto: boolean;
  gallery: Array<{ index: number; photo: PreparedPhoto | null }>;
}

function PhotoSlot({ photoId, photo, onSelect, onRemove }: {
  photoId?: string;
  photo?: PreparedPhoto;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [date, setDate] = useState("");

  useEffect(() => {
    setPreview(null);
    setDate("");

    if (photo) {
      const url = URL.createObjectURL(photo.blob);
      setPreview(url);
      setDate(new Date().toISOString());
      return () => URL.revokeObjectURL(url);
    }

    if (photoId) {
      void getPlantPhoto(photoId).then(value =>
        setDate(value?.createdAt ?? ""),
      );
    }
  }, [photo, photoId]);

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        className="h-24 w-full overflow-hidden rounded-xl border border-border bg-secondary"
      >
        {preview || photoId ? (
          <PlantImage
            photoId={photo ? null : photoId}
            previewUrl={preview}
            className="h-full w-full"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <ImagePlus size={22} />
          </span>
        )}
      </button>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="truncate text-[10px] text-muted-foreground">
          {date
            ? new Date(date).toLocaleDateString("ru-RU")
            : "Добавить фото"}
        </span>
        {(photoId || photo) && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] text-red-500"
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}

export function EditPlantModal({
  up,
  catalogPlant,
  onSave,
  onClose,
}: {
  up: UserPlant;
  catalogPlant?: PlantImageSource | null;
  onSave: (
    data: EditPlantSaveData,
  ) => Promise<boolean>;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] =
    useState(up.nickname);
  const [
    wateringInterval,
    setWateringInterval,
  ] = useState(up.wateringInterval);
  const [
    lastWateringDate,
    setLastWateringDate,
  ] = useState(
    up.wateringHistory.at(-1)?.slice(0, 10) ??
      "",
  );
  const [
    fertilizingInterval,
    setFertilizingInterval,
  ] = useState(up.fertilizingInterval);
  const [
    mistingEnabled,
    setMistingEnabled,
  ] = useState(
    isMistingEnabled(up),
  );
  const [
    lightEnabled,
    setLightEnabled,
  ] = useState(
    Boolean(up.supplementalLight),
  );
  const [
    lightStart,
    setLightStart,
  ] = useState(
    up.supplementalLight?.start ??
      "12:00",
  );
  const [
    lightEnd,
    setLightEnd,
  ] = useState(
    up.supplementalLight?.end ??
      "22:00",
  );
  const [description, setDescription] =
    useState(up.customDescription ?? "");
  const initialPhotoIds = getPlantPhotoIds(up);
  const [photoChanges, setPhotoChanges] = useState(
    new Map<number, PreparedPhoto | null>(),
  );
  const selectedPhotoIndex = useRef(0);
  const [isPreparing, setIsPreparing] =
    useState(false);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] = useState("");

  const handlePhoto = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsPreparing(true);
    setError("");

    try {
      const prepared = await preparePhoto(file);
      setPhotoChanges(current =>
        new Map(current).set(
          selectedPhotoIndex.current,
          prepared,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось обработать фотографию.",
      );
    } finally {
      setIsPreparing(false);
    }
  };

  const handleSave = async () => {
    if (
      !nickname.trim() ||
      isPreparing ||
      isSaving
    ) {
      return;
    }

    if (
      lightEnabled &&
      lightStart === lightEnd
    ) {
      setError(
        "Время начала и окончания дополнительного освещения должно отличаться.",
      );
      return;
    }

    setIsSaving(true);
    setError("");

    const saved = await onSave({
      changes: {
        nickname: nickname.trim(),
        wateringInterval,
        fertilizingInterval,
        mistingEnabled,
        supplementalLight:
          lightEnabled
            ? {
                start: lightStart,
                end: lightEnd,
              }
            : null,
        wateringHistory:
          replaceLastWateringDate(
            up.wateringHistory,
            lastWateringDate || null,
          ),
        customDescription:
          description.trim() || undefined,
      },
      photo: null,
      removePhoto: false,
      gallery: [...photoChanges].map(
        ([index, photo]) => ({
          index,
          photo,
        }),
      ),
    });

    setIsSaving(false);

    if (saved) {
      onClose();
    } else {
      setError("Не удалось сохранить изменения.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center px-4 pb-8">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={isSaving ? undefined : onClose}
      />
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="relative max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            Редактировать растение
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Закрыть редактирование"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-secondary p-3">
          <p className="mb-2 text-xs font-medium text-foreground">
            Фотографии · максимум {MAX_PLANT_PHOTOS}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Array.from(
              { length: MAX_PLANT_PHOTOS },
              (_, index) => {
                const changed =
                  photoChanges.get(index);
                const removed =
                  photoChanges.has(index) &&
                  changed === null;

                return (
                  <PhotoSlot
                    key={index}
                    photoId={
                      removed
                        ? undefined
                        : initialPhotoIds[index]
                    }
                    photo={changed ?? undefined}
                    onSelect={() => {
                      selectedPhotoIndex.current =
                        index;
                      fileRef.current?.click();
                    }}
                    onRemove={
                      initialPhotoIds[index] || changed
                        ? () =>
                            setPhotoChanges(current =>
                              new Map(current).set(
                                index,
                                null,
                              ),
                            )
                        : undefined
                    }
                  />
                );
              },
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
          {isPreparing && (
            <p className="mt-2 text-xs text-muted-foreground">
              Подготовка фотографии…
            </p>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Название
        </label>
        <input
          value={nickname}
          onChange={event =>
            setNickname(event.target.value)
          }
          className="mb-4 w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none"
        />

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Описание
        </label>
        <textarea
          value={description}
          onChange={event =>
            setDescription(event.target.value)
          }
          rows={3}
          className="mb-4 w-full resize-none rounded-2xl bg-muted px-4 py-3 text-sm outline-none"
          placeholder="Особенности ухода или растения"
        />

        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Полив каждые {wateringInterval} дн.
        </label>
        <div className="mb-4 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={60}
            value={wateringInterval}
            onChange={event =>
              setWateringInterval(
                Number(event.target.value),
              )
            }
            className="min-w-0 flex-1 accent-primary"
          />
          <input
            aria-label="Интервал полива в днях"
            type="number"
            min={1}
            max={60}
            value={wateringInterval}
            onChange={event =>
              setWateringInterval(
                Math.min(
                  60,
                  Math.max(
                    1,
                    Number(event.target.value) || 1,
                  ),
                ),
              )
            }
            className="w-16 rounded-xl bg-muted px-2 py-2 text-center text-sm outline-none"
          />
        </div>

        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Последний полив
            </label>
            {lastWateringDate && (
              <button
                type="button"
                onClick={() =>
                  setLastWateringDate("")
                }
                className="text-[11px] font-medium text-red-500"
              >
                Удалить отметку
              </button>
            )}
          </div>
          <input
            type="date"
            max={todayStr()}
            value={lastWateringDate}
            onChange={event =>
              setLastWateringDate(
                event.target.value,
              )
            }
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Исправьте дату, если полив отметили не в тот день.
          </p>
        </div>

        <div className="mb-4 rounded-2xl border border-border p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Wind size={15} />
                Опрыскивание
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                Отключите для растений, которым опрыскивание не требуется.
              </span>
            </span>
            <input
              type="checkbox"
              checked={mistingEnabled}
              onChange={event =>
                setMistingEnabled(
                  event.target.checked,
                )
              }
              className="h-5 w-5 flex-shrink-0 accent-primary"
            />
          </label>
        </div>

        <div className="mb-4 rounded-2xl border border-border p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Lightbulb size={15} />
                Доп. освещение
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                Ежедневный диапазон работы лампы.
              </span>
            </span>
            <input
              type="checkbox"
              checked={lightEnabled}
              onChange={event =>
                setLightEnabled(
                  event.target.checked,
                )
              }
              className="h-5 w-5 flex-shrink-0 accent-primary"
            />
          </label>

          {lightEnabled && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-[11px] font-medium text-muted-foreground">
                С
                <input
                  type="time"
                  value={lightStart}
                  onChange={event =>
                    setLightStart(
                      event.target.value,
                    )
                  }
                  className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground outline-none"
                />
              </label>
              <label className="text-[11px] font-medium text-muted-foreground">
                До
                <input
                  type="time"
                  value={lightEnd}
                  onChange={event =>
                    setLightEnd(
                      event.target.value,
                    )
                  }
                  className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground outline-none"
                />
              </label>
            </div>
          )}
        </div>

        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Подкормка каждые {fertilizingInterval} дн.
        </label>
        <input
          type="range"
          min={0}
          max={90}
          value={fertilizingInterval}
          onChange={event =>
            setFertilizingInterval(
              Number(event.target.value),
            )
          }
          className="mb-5 w-full accent-primary"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-2xl border border-border py-3.5 text-sm font-medium disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={
              !nickname.trim() ||
              isPreparing ||
              isSaving
            }
            onClick={() => void handleSave()}
            className="flex-1 rounded-2xl bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {isSaving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
