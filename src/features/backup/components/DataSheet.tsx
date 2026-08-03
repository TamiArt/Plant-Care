import { useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Database, Download, Upload, X } from "lucide-react";
import type { UserPlant } from "../../garden/types";
import { createBackup, downloadBackup, mergeBackupPlants, parseBackup, type PlantCareSettings } from "../backup";

export function DataSheet({
  plants,
  settings,
  onImport,
  onClose,
}: {
  plants: UserPlant[];
  settings: PlantCareSettings;
  onImport: (plants: UserPlant[], settings: PlantCareSettings | null, mode: "replace" | "merge") => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [mergeMode, setMergeMode] = useState<"replace" | "merge">("merge");

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const result = parseBackup(parsed);
        if (!result.backup) {
          setStatus("error");
          setErrorMsg(result.error ?? "Файл повреждён или имеет неверный формат.");
          e.target.value = "";
          return;
        }
        const backup = result.backup;
        if (mergeMode === "merge") {
          const merged = mergeBackupPlants(plants, backup.plants);
          onImport(merged.plants, null, "merge");
          setImportedCount(merged.addedCount);
        } else {
          onImport(backup.plants, backup.settings, "replace");
          setImportedCount(backup.plants.length);
        }
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMsg("Не удалось прочитать файл. Убедитесь, что это JSON.");
      }
      // reset input so the same file can be re-selected
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative bg-background rounded-t-3xl w-full max-w-md"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pt-2 pb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Мои данные</h2>
              <p className="text-xs text-muted-foreground">{plants.length} растений в саду</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X size={16} />
            </button>
          </div>

          {/* Storage info */}
          <div className="bg-secondary rounded-2xl p-4 mb-4 flex items-start gap-3">
            <Database size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-0.5">Локальное хранилище</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Данные не отправляются на Vercel. Скачайте JSON-файл и откройте его через импорт на любом другом устройстве.
              </p>
            </div>
          </div>

          {/* Export */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-3">
            <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Download size={16} className="text-primary" /> Сохранить резервную копию
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Скачать переносимый файл <code className="bg-muted px-1 rounded text-[11px]">.json</code> со всеми растениями, фото, историей, заметками, напоминаниями и настройками.
            </p>
            <button
              onClick={() => downloadBackup(createBackup(plants, settings))}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Экспортировать ({plants.length} растений)
            </button>
          </div>

          {/* Import */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Upload size={16} className="text-primary" /> Загрузить резервную копию
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Открыть JSON с этого или другого устройства. «Заменить всё» также восстановит сохранённые настройки.
            </p>

            {/* Merge mode toggle */}
            <div className="flex bg-muted rounded-xl p-1 gap-1 mb-3">
              <button
                onClick={() => setMergeMode("merge")}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  mergeMode === "merge" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Объединить
              </button>
              <button
                onClick={() => setMergeMode("replace")}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  mergeMode === "replace" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Заменить всё
              </button>
            </div>

            {mergeMode === "replace" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 flex gap-2">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">Текущие данные будут удалены и заменены данными из файла.</p>
              </div>
            )}

            <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
            <button
              onClick={() => { setStatus("idle"); fileRef.current?.click(); }}
              className="w-full py-3 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 text-foreground"
            >
              <Upload size={16} />
              Выбрать файл
            </button>

            {/* Result messages */}
            <AnimatePresence>
              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2 items-start"
                >
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800">
                    {mergeMode === "merge"
                      ? `Добавлено ${importedCount} новых растений.`
                      : `Загружено ${importedCount} растений. Старые данные заменены.`}
                  </p>
                </motion.div>
              )}
              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 items-start"
                >
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
