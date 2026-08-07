import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { motion } from "motion/react";
import { ImagePlus, X } from "lucide-react";
import {
  PlantImage,
  type PlantImageSource,
} from "../../../shared/components/PlantImage";
import { replaceLastWateringDate } from "../model/watering";
import {
  preparePhoto,
  type PreparedPhoto,
} from "../services/preparePhoto";
import type { UserPlant } from "../types";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export interface EditPlantSaveData {
  changes: Partial<UserPlant>;
  photo: PreparedPhoto | null;
  removePhoto: boolean;
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
  const [description, setDescription] =
    useState(up.customDescription ?? "");
  const [newPhoto, setNewPhoto] =
    useState<PreparedPhoto | null>(null);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);
  const [removePhoto, setRemovePhoto] =
    useState(false);
  const [isPreparing, setIsPreparing] =
    useState(false);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!newPhoto) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(newPhoto.blob);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [newPhoto]);

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
      setNewPhoto(await preparePhoto(file));
      setRemovePhoto(false);
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

  const hasPhoto =
    Boolean(newPhoto) ||
    (!removePhoto && Boolean(up.photoId));

  const handleSave = async () => {
    if (
      !nickname.trim() ||
      isPreparing ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setError("");

    const saved = await onSave({
      changes: {
        nickname: nickname.trim(),
        wateringInterval,
        fertilizingInterval,
        wateringHistory:
          replaceLastWateringDate(
            up.wateringHistory,
            lastWateringDate || null,
          ),
        customDescription:
          description.trim() || undefined,
      },
      photo: newPhoto,
      removePhoto,
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

        <div className="mb-4 overflow-hidden rounded-2xl bg-secondary">
          <PlantImage
            catalogPlant={catalogPlant}
            photoId={
              removePhoto ? null : up.photoId
            }
            previewUrl={previewUrl}
            emoji={up.customEmoji}
            className="h-40 w-full"
          />
          <div className="flex gap-2 p-3">
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
              onClick={() =>
                fileRef.current?.click()
              }
              disabled={isPreparing || isSaving}
              className="flex-1 rounded-xl bg-card px-3 py-2.5 text-xs font-medium text-primary disabled:opacity-40"
            >
              <ImagePlus
                size={14}
                className="mr-1.5 inline"
              />
              {isPreparing
                ? "Подготовка…"
                : hasPhoto
                  ? "Заменить фото"
                  : "Добавить фото"}
            </button>

            {hasPhoto && (
              <button
                type="button"
                onClick={() => {
                  setNewPhoto(null);
                  setRemovePhoto(true);
                }}
                disabled={isSaving}
                className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-500 disabled:opacity-40"
              >
                Удалить
              </button>
            )}
          </div>
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
            Исправьте дату, если полив отметили не в тот
            день.
          </p>
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
