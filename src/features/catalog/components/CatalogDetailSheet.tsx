import { motion } from "motion/react";
import { AlertTriangle, Plus, Snowflake, Sun, Wind, X } from "lucide-react";
import { PlantImage } from "../../../shared/components/PlantImage";
import type { CatalogPlant } from "../types";
import { DifficultyBadge } from "./DifficultyBadge";
import { GbifPanel } from "./GbifPanel";

export function CatalogDetailSheet({
  cp, onClose, onAddToGarden,
}: { cp: CatalogPlant; onClose: () => void; onAddToGarden: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative mt-auto bg-background rounded-t-3xl max-h-[93vh] flex flex-col"
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative">
            <PlantImage catalogPlant={cp} className="w-full h-56" />
            <button onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pt-4 pb-2">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">{cp.name}</h2>
                <p className="text-sm text-muted-foreground italic">{cp.latinName}</p>
              </div>
              <DifficultyBadge value={cp.difficulty} />
            </div>

            {cp.source === "gbif" && (
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
                <strong>Научная запись GBIF.</strong> Название и классификация получены из глобального справочника,
                а интервал полива ниже является безопасной стартовой настройкой, не рекомендацией для конкретного вида.
              </div>
            )}

            {cp.difficulty === "hard" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex gap-2.5">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>Внимание новичкам!</strong> Это капризное растение требует опыта и строгого режима ухода.
                </p>
              </div>
            )}

            <p className="text-sm text-foreground leading-relaxed mb-4">{cp.description}</p>

            <div className="bg-secondary rounded-2xl p-4 mb-4">
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-2">Уход</p>
              <p className="text-sm text-foreground leading-relaxed">{cp.careTip}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <Sun size={20} className="mx-auto mb-1 text-amber-500" />
                <p className="text-xl font-bold text-foreground">{cp.watering.summer}</p>
                <p className="text-xs text-muted-foreground">дней летом</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <Snowflake size={20} className="mx-auto mb-1 text-sky-400" />
                <p className="text-xl font-bold text-foreground">{cp.watering.winter}</p>
                <p className="text-xs text-muted-foreground">дней зимой</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {cp.tags.map(t => (
                <span key={t} className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full">{t}</span>
              ))}
              {cp.needsMisting && (
                <span className="text-xs bg-sky-100 text-sky-700 px-3 py-1 rounded-full flex items-center gap-1">
                  <Wind size={10} /> нужно опрыскивание
                </span>
              )}
            </div>

            {cp.diseases.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Типичные проблемы</p>
                {cp.diseases.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                    <span className="text-red-400 mt-0.5 text-sm">•</span>
                    <p className="text-sm text-foreground">{d}</p>
                  </div>
                ))}
              </div>
            )}

            {/* GBIF scientific data panel */}
            <GbifPanel latinName={cp.latinName} />
          </div>
        </div>

        <div className="px-5 pt-3 pb-6 border-t border-border bg-background flex-shrink-0">
          <button onClick={onAddToGarden}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Добавить в мой сад
          </button>
        </div>
      </motion.div>
    </div>
  );
}
