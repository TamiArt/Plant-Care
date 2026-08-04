import { useState } from "react";
import { motion } from "motion/react";
import { Home, Trees } from "lucide-react";
import type { PlantLocation } from "../../garden/types";
import type { CatalogPlant } from "../types";

export function AddToGardenModal({
  cp, defaultWateringInterval, photo, defaultLocation = "home", onConfirm, onClose,
}: {
  cp: CatalogPlant;
  defaultWateringInterval: number;
  photo?: string | null;
  defaultLocation?: PlantLocation;
  onConfirm: (nickname: string, interval: number, location: PlantLocation) => void;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(cp.name);
  const [interval, setWaterInterval] = useState(defaultWateringInterval);
  const [location, setLocation] = useState<PlantLocation>(defaultLocation);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-10">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        className="relative bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-lg font-bold text-foreground mb-4">Добавить растение</h3>

        <div className="mb-4">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">
            Имя растения
          </label>
          <input
            value={nickname} onChange={e => setNickname(e.target.value)}
            placeholder="Название или имя"
            className="w-full bg-muted rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Location picker */}
        <div className="mb-4">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">
            Где растёт?
          </label>
          <div className="flex bg-muted rounded-2xl p-1 gap-1">
            <button
              onClick={() => setLocation("home")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location === "home"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Home size={15} /> Дома
            </button>
            <button
              onClick={() => setLocation("outdoor")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location === "outdoor"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Trees size={15} /> На участке
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">
            Полив каждые <strong className="text-foreground">{interval}</strong> дн.
          </label>
          <input
            type="range" min={1} max={60} value={interval}
            onChange={e => setWaterInterval(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1 день</span><span>60 дней</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-border text-sm font-medium">
            Отмена
          </button>
          <button
            onClick={() => { onConfirm(nickname.trim() || cp.name, interval, location); onClose(); }}
            className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium"
          >
            Добавить
          </button>
        </div>
      </motion.div>
    </div>
  );
}
