import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { motion } from "motion/react";
import {
  Camera,
  Home,
  ImagePlus,
  Trees,
  X,
} from "lucide-react";
import type { PlantLocation } from "../types";
import {
  preparePhoto,
  type PreparedPhoto,
} from "../services/preparePhoto";

export interface CustomPlantSubmitData {
  nickname: string;
  wateringInterval: number;
  location: PlantLocation;
  customName: string;
  customLatinName?: string;
  customDescription?: string;
  customEmoji: string;
  photo: PreparedPhoto | null;
}

export function CustomPlantModal({
  defaultLocation = "home",
  initialPhoto = null,
  onConfirm,
  onClose,
}: {
  defaultLocation?: PlantLocation;
  initialPhoto?: PreparedPhoto | null;
  onConfirm: (
    data: CustomPlantSubmitData,
  ) => Promise<boolean>;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [latinName, setLatinName] = useState("");
  const [description, setDescription] =
    useState("");
  const [emoji, setEmoji] = useState("🌿");
  const [photo, setPhoto] =
    useState<PreparedPhoto | null>(initialPhoto);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);
  const [interval, setWaterInterval] =
    useState(7);
  const [location, setLocation] =
    useState<PlantLocation>(defaultLocation);
  const [isPreparing, setIsPreparing] =
    useState(false);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] = useState("");

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
    setError("");

    try {
      setPhoto(await preparePhoto(file));
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

  const handleSubmit = async () => {
    if (
      !name.trim() ||
      isPreparing ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setError("");

    const saved = await onConfirm({
      nickname: name.trim(),
      wateringInterval: interval,
      location,
      customName: name.trim(),
      customLatinName:
        latinName.trim() || undefined,
      customDescription:
        description.trim() || undefined,
      customEmoji: emoji,
      photo,
    });

    setIsSaving(false);

    if (saved) {
      onClose();
    } else {
      setError("Не удалось сохранить растение.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={isSaving ? undefined : onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{
          type: "spring",
          damping: 28,
          stiffness: 280,
        }}
        className="relative w-full max-w-md rounded-t-3xl bg-background"
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="max-h-[90vh] space-y-4 overflow-y-auto px-5 pb-8 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Своё растение
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted disabled:opacity-40"
            >
              <X size={16} />
            </button>
          </div>

          <div
            onClick={() => {
              if (!isPreparing && !isSaving) {
                fileRef.current?.click();
              }
            }}
            className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/25 bg-secondary"
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
              <>
                <img
                  src={previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs backdrop-blur">
                  <Camera size={10} />
                  Изменить
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImagePlus
                  size={28}
                  className="text-primary"
                />
                <p className="text-xs text-muted-foreground">
                  {isPreparing
                    ? "Подготовка фотографии…"
                    : "Добавить фото (необязательно)"}
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Эмодзи
              </label>
              <input
                value={emoji}
                onChange={event =>
                  setEmoji(event.target.value)
                }
                className="w-14 rounded-xl bg-muted px-2 py-3 text-center text-xl outline-none"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Название *
              </label>
              <input
                value={name}
                onChange={event =>
                  setName(event.target.value)
                }
                placeholder="Например: Моя петуния"
                className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Латинское название
            </label>
            <input
              value={latinName}
              onChange={event =>
                setLatinName(event.target.value)
              }
              placeholder="Petunia × hybrida (необязательно)"
              className="w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Описание
            </label>
            <textarea
              value={description}
              onChange={event =>
                setDescription(event.target.value)
              }
              placeholder="Заметки об особенностях растения..."
              rows={3}
              className="w-full resize-none rounded-xl bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Где растёт?
            </label>
            <div className="flex gap-1 rounded-2xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setLocation("home")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all ${
                  location === "home"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <Home size={15} />
                Дома
              </button>
              <button
                type="button"
                onClick={() =>
                  setLocation("outdoor")
                }
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all ${
                  location === "outdoor"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <Trees size={15} />
                На участке
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Полив каждые{" "}
              <strong className="text-foreground">
                {interval}
              </strong>{" "}
              дн.
            </label>
            <input
              type="range"
              min={1}
              max={60}
              value={interval}
              onChange={event =>
                setWaterInterval(
                  Number(event.target.value),
                )
              }
              className="w-full accent-primary"
            />
          </div>

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
              onClick={() => void handleSubmit()}
              disabled={
                !name.trim() ||
                isPreparing ||
                isSaving
              }
              className="flex-1 rounded-2xl bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {isSaving ? "Сохранение…" : "Добавить"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
