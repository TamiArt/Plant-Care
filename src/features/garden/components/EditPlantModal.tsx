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
import { getPlantPhotoIds } from "../model/photos";
import { MAX_PLANT_PHOTOS } from "../model/photoGallery";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export interface EditPlantSaveData {
  changes: Partial<UserPlant>;
  photo: PreparedPhoto | null;
  removePhoto: boolean;
  gallery: Array<{ photoId?: string; photo?: PreparedPhoto }>;
  primaryPhotoIndex: number | null;
}

function PhotoSlot({
  photoId,
  photo,
  isPrimary,
  onSelect,
  onMakePrimary,
  onRemove,
}: {
  photoId?: string;
  photo?: PreparedPhoto;
  isPrimary: boolean;
  onSelect: () => void;
  onMakePrimary: () => void;
  onRemove: () => void;
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
        className="relative h-28 w-full overflow-hidden rounded-xl border border-border bg-secondary"
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
        {isPrimary && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-1 text-[9px] font-bold text-primary-foreground">
            Главное
          </span>
        )}
      </button>

      <div className="mt-1 flex items-center gap-1">
        {!isPrimary && (
          <button
            type="button"
            onClick={onMakePrimary}
            className="min-w-0 flex-1 truncate text-left text-[10px] font-medium text-primary"
          >
            Сделать главным
          </button>
        )}
        {isPrimary && (
          <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
            Показывается в карточке
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] text-red-500"
        >
          Удалить
        </button>
      </div>

      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
        {date
          ? new Date(date).toLocaleDateString("ru-RU")
          : photo
            ? "Новое фото"
            : ""}
      </span>
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
  const [nickname, setNickname] = useState(up.nickname);
  const [wateringInterval, setWateringInterval] = useState(up.wateringInterval);
  const [lastWateringDate, setLastWateringDate] = useState(
    up.wateringHistory.at(-1)?.slice(0, 10) ?? "",
  );
  const [fertilizingInterval, setFertilizingInterval] = useState(up.fertilizingInterval);
  const [mistingEnabled, setMistingEnabled] = useState(isMistingEnabled(up));
  const [lightEnabled, setLightEnabled] = useState(Boolean(up.supplementalLight));
  const [lightStart, setLightStart] = useState(up.supplementalLight?.start ?? "12:00");
  const [lightEnd, setLightEnd] = useState(up.supplementalLight?.end ?? "22:00");
  const [description, setDescription] = useState(up.customDescription ?? "");
  const initialPhotoIds = getPlantPhotoIds(up);
  const [photoSlots, setPhotoSlots] = useState<
    Array<{ photoId?: string; photo?: PreparedPhoto }>
  >(() => initialPhotoIds.map(photoId => ({ photoId })));
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number | null>(() => {
    const primaryId = typeof up.photoId === "string" ? up.photoId : null;
    const index = primaryId ? initialPhotoIds.indexOf(primaryId) : -1;
    return index >= 0 ? index : initialPhotoIds.length > 0 ? 0 : null;
  });
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedPhotoIndex = useRef<number | null>(null);

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const index = selectedPhotoIndex.current;
    event.target.value = "";

    if (!file || index === null) return;

    setIsPreparing(true);
    setError("");

    try {
      const prepared = await preparePhoto(file);
      setPhotoSlots(current => {
        const next = [...current];
        while (next.length < index) next.push({});
        next[index] = { photo: prepared };
        return next.slice(0, MAX_PLANT_PHOTOS);
      });
      if (primaryPhotoIndex === null) setPrimaryPhotoIndex(index);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось обработать фотографию.",
      );
    } finally {
      setIsPreparing(false);
      selectedPhotoIndex.current = null;
    }
  };

  const handleSelectPhoto = (index: number) => {
    selectedPhotoIndex.current = index;
    fileRef.current?.click();
  };

  const handleAddPhoto = () => {
    if (photoSlots.length >= MAX_PLANT_PHOTOS) {
      setError("У растения может быть не более 3 фотографий.");
      return;
    }
    setError("");
    selectedPhotoIndex.current = photoSlots.length;
    fileRef.current?.click();
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoSlots(current =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    setPrimaryPhotoIndex(current => {
      if (current === null) return null;
      if (current === index) {
        const nextLength = photoSlots.length - 1;
        return nextLength > 0 ? Math.min(index, nextLength - 1) : null;
      }
      return current > index ? current - 1 : current;
    });
  };

  const handleSave = async () => {
    if (!nickname.trim() || isPreparing || isSaving) return;

    if (lightEnabled && lightStart === lightEnd) {
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
        supplementalLight: lightEnabled
          ? { start: lightStart, end: lightEnd }
          : null,
        wateringHistory: replaceLastWateringDate(
          up.wateringHistory,
          lastWateringDate || null,
        ),
        customDescription: description.trim() || undefined,
      },
      photo: null,
      removePhoto: false,
      gallery: photoSlots.slice(0, MAX_PLANT_PHOTOS),
      primaryPhotoIndex,
    });

    setIsSaving(false);

    if (saved) onClose();
    else setError("Не удалось сохранить изменения.");
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
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-foreground">
              Фотографии растения
            </p>
            <span className="text-[10px] text-muted-foreground">
              {photoSlots.length} / {MAX_PLANT_PHOTOS} фото
            </span>
          </div>

          {photoSlots.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {photoSlots.map((slot, index) => (
                <PhotoSlot
                  key={slot.photoId ?? `new-${index}`}
                  photoId={slot.photoId}
                  photo={slot.photo}
                  isPrimary={primaryPhotoIndex === index}
                  onSelect={() => handleSelectPhoto(index)}
                  onMakePrimary={() => setPrimaryPhotoIndex(index)}
                  onRemove={() => handleRemovePhoto(index)}
                />
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Пока нет фотографий.
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />

          <button
            type="button"
            disabled={
              isPreparing ||
              isSaving ||
              photoSlots.length >= MAX_PLANT_PHOTOS
            }
            onClick={handleAddPhoto}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ImagePlus size={15} />
            {photoSlots.length >= MAX_PLANT_PHOTOS
              ? "Максимум 3 фотографии"
              : "Добавить фотографию"}
          </button>

          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Все фотографии сохраняются. Нажмите «Сделать главным», чтобы выбрать
            фото, которое будет показываться в общей карточке растения.
          </p>

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
          onChange={event => setNickname(event.target.value)}
          className="mb-4 w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none"
        />

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Описание
        </label>
        <textarea
          value={description}
          onChange={event => setDescription(event.target.value)}
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
            onChange={event => setWateringInterval(Number(event.target.value))}
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
                Math.min(60, Math.max(1, Number(event.target.value) || 1)),
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
                onClick={() => setLastWateringDate("")}
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
            onChange={event => setLastWateringDate(event.target.value)}
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
              onChange={event => setMistingEnabled(event.target.checked)}
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
              onChange={event => setLightEnabled(event.target.checked)}
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
                  onChange={event => setLightStart(event.target.value)}
                  className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground outline-none"
                />
              </label>
              <label className="text-[11px] font-medium text-muted-foreground">
                До
                <input
                  type="time"
                  value={lightEnd}
                  onChange={event => setLightEnd(event.target.value)}
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
          onChange={event => setFertilizingInterval(Number(event.target.value))}
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
            disabled={!nickname.trim() || isPreparing || isSaving}
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
