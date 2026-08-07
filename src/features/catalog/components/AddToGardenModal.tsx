import { useState } from "react";
import { motion } from "motion/react";
import { Home, Trees } from "lucide-react";
import type {
  PlantLocation,
  PreparedPhoto,
} from "../../garden";
import type { CatalogPlant } from "../types";

export function AddToGardenModal({
  cp,
  defaultWateringInterval,
  photo,
  defaultLocation = "home",
  onConfirm,
  onClose,
}: {
  cp: CatalogPlant;
  defaultWateringInterval: number;
  photo?: PreparedPhoto | null;
  defaultLocation?: PlantLocation;
  onConfirm: (
    nickname: string,
    interval: number,
    location: PlantLocation,
  ) => Promise<boolean>;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(cp.name);
  const [interval, setWaterInterval] =
    useState(defaultWateringInterval);
  const [location, setLocation] =
    useState<PlantLocation>(defaultLocation);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");

    const saved = await onConfirm(
      nickname.trim() || cp.name,
      interval,
      location,
    );

    setIsSaving(false);

    if (saved) {
      onClose();
    } else {
      setError("Не удалось сохранить растение.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-10">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={isSaving ? undefined : onClose}
      />
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"
      >
        <h3 className="mb-4 text-lg font-bold text-foreground">
          Добавить растение
        </h3>

        {photo && (
          <p className="mb-4 rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
            Подготовленная фотография будет сохранена вместе
            с растением.
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Имя растения
          </label>
          <input
            value={nickname}
            onChange={event =>
              setNickname(event.target.value)
            }
            placeholder="Название или имя"
            className="w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
              onClick={() => setLocation("outdoor")}
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

        <div className="mb-6">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>1 день</span>
            <span>60 дней</span>
          </div>
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
            onClick={() => void handleConfirm()}
            disabled={isSaving}
            className="flex-1 rounded-2xl bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {isSaving ? "Сохранение…" : "Добавить"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
