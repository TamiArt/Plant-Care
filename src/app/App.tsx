import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Droplets, Leaf, BookOpen, ListChecks, Plus, Camera,
  Scan, X, ChevronRight, Wind, Sun, Snowflake,
  Trash2, Search, AlertTriangle, Home, Trees,
  Download, Upload, Database, CheckCircle2,
  FlaskConical, StickyNote, Bell, Square, CheckSquare,
  Bot, Loader2, ImagePlus, WifiOff, Smartphone, Pencil, List,
} from "lucide-react";
import { usePwa } from "../pwa";
import { CATALOG } from "../features/catalog/catalog";
import { filterCatalog } from "../features/catalog/search";
import type { CatalogPlant } from "../features/catalog/types";
import { CatalogScreen, CATALOG_FILTERS } from "../features/catalog/CatalogScreen";
import { LANG_LABELS, toExternalTaxon, useGbif } from "../features/catalog/gbif";
import { useGarden, type PlantLocation, type UserPlant } from "../features/garden";
import { createBackup, DEFAULT_SETTINGS, downloadBackup, parseBackup, type PlantCareSettings } from "../features/backup/backup";
import { AiAssistantSheet, type AssistantContext } from "../features/assistant";
import { ChecklistScreen, getSeasonLabel, isWinterMonth } from "../features/care";
import { getNoteLineKind, insertNotePrefix, toggleChecklistLine } from "../features/garden/noteUtils";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface WateringStatus {
  label: string;
  color: "green" | "yellow" | "red" | "gray";
  daysUntil: number;
  urgency: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86_400_000);
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function getWateringStatus(up: UserPlant): WateringStatus {
  const interval = up.wateringInterval;
  if (up.wateringHistory.length === 0) {
    return { label: "Полейте сегодня", color: "gray", daysUntil: 0, urgency: 0.5 };
  }
  const last = up.wateringHistory[up.wateringHistory.length - 1];
  const days = daysSince(last);
  const daysUntil = interval - days;
  if (daysUntil <= 0) {
    return {
      label: daysUntil === 0 ? "Полейте сегодня" : `Просрочено ${Math.abs(daysUntil)} дн.`,
      color: "red", daysUntil, urgency: 1,
    };
  }
  if (daysUntil === 1) return { label: "Полейте завтра", color: "yellow", daysUntil, urgency: 0.7 };
  return { label: `Через ${daysUntil} дн.`, color: "green", daysUntil, urgency: 0 };
}

// Resolve display info for both catalog and custom plants
interface PlantDisplay {
  name: string;
  latinName: string;
  emoji: string;
  needsMisting: boolean;
  tags: string[];
}

function resolvePlantDisplay(up: UserPlant): PlantDisplay {
  if (up.catalogId) {
    const cp = CATALOG.find(c => c.id === up.catalogId);
    if (cp) return { name: cp.name, latinName: cp.latinName, emoji: cp.emoji, needsMisting: cp.needsMisting, tags: cp.tags };
  }
  return {
    name: up.customName || "Моё растение",
    latinName: up.customLatinName || "",
    emoji: up.customEmoji || "🌿",
    needsMisting: false,
    tags: [],
  };
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function StatusBadge({ s }: { s: WateringStatus }) {
  const cls = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-secondary text-secondary-foreground",
  }[s.color];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s.label}</span>;
}

function DifficultyBadge({ d }: { d: "easy" | "medium" | "hard" }) {
  const map = {
    easy: { label: "Простой", cls: "bg-emerald-100 text-emerald-700" },
    medium: { label: "Средний", cls: "bg-amber-100 text-amber-700" },
    hard: { label: "Дива ⚠️", cls: "bg-red-100 text-red-700" },
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[d].cls}`}>{map[d].label}</span>;
}

function PlantImg({
  cp, userPhoto, emoji, className = "",
}: { cp?: CatalogPlant | null; userPhoto?: string | null; emoji?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const fallbackEmoji = emoji || cp?.emoji || "🌿";
  if (userPhoto && !failed) {
    return (
      <img src={userPhoto} alt=""
        className={`object-cover bg-secondary ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }
  if (cp?.unsplashId && !failed) {
    const src = `https://images.unsplash.com/${cp.unsplashId}?w=400&h=400&fit=crop&auto=format`;
    return (
      <img src={src} alt={cp.name}
        className={`object-cover bg-secondary ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }
  return <div className={`flex items-center justify-center bg-secondary text-4xl ${className}`}>{fallbackEmoji}</div>;
}

// ─── WATER DROP INDICATOR ────────────────────────────────────────────────────
function WaterDrop({ filled, overdue }: { filled: boolean; overdue: boolean }) {
  const color = overdue ? "#ef4444" : filled ? "#2d5a27" : undefined;
  return (
    <svg width="9" height="12" viewBox="0 0 9 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4.5 0 C4.5 0 0 5.2 0 7.8 C0 10.1 2.02 12 4.5 12 C6.98 12 9 10.1 9 7.8 C9 5.2 4.5 0 4.5 0Z"
        fill={filled || overdue ? (color ?? "#2d5a27") : "none"}
        stroke={color ?? "#2d5a27"}
        strokeWidth="0.8"
        opacity={filled || overdue ? 1 : 0.25}
      />
    </svg>
  );
}

function WaterDropCounter({ status, interval }: { status: WateringStatus; interval: number }) {
  // cap display at 10 drops; scale proportionally for long intervals
  const MAX = 10;
  const total = Math.min(interval, MAX);
  const overdue = status.daysUntil < 0;
  const dueToday = status.daysUntil === 0 && status.color !== "gray";
  const neverWatered = status.color === "gray";

  // how many drops to fill
  const filled = overdue
    ? 0
    : interval <= MAX
      ? Math.max(0, status.daysUntil)
      : Math.round((Math.max(0, status.daysUntil) / interval) * MAX);

  const labelColor = overdue || dueToday
    ? "text-red-500"
    : status.color === "yellow"
      ? "text-amber-600"
      : "text-muted-foreground";

  let label: string;
  if (neverWatered) {
    label = "Полейте сегодня";
  } else if (dueToday || overdue) {
    label = overdue
      ? `Просрочено на ${Math.abs(status.daysUntil)} дн.`
      : "Полить сегодня";
  } else if (status.daysUntil === 1) {
    label = "Полить завтра";
  } else {
    label = `До полива ${status.daysUntil} дн.`;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5 flex-wrap">
        {Array.from({ length: total }).map((_, i) => (
          <WaterDrop key={i} filled={i < filled} overdue={overdue} />
        ))}
      </div>
      <p className={`text-[11px] font-medium leading-none ${labelColor}`}>{label}</p>
    </div>
  );
}

// ─── PLANT CARD ──────────────────────────────────────────────────────────────
function PlantCard({
  up, onWater, onMist, onOpen,
}: { up: UserPlant; onWater: () => void; onMist: () => void; onOpen: () => void }) {
  const cp = up.catalogId ? CATALOG.find(c => c.id === up.catalogId) ?? null : null;
  const display = resolvePlantDisplay(up);
  const status = getWateringStatus(up);
  const mistToday = up.mistingHistory[up.mistingHistory.length - 1] === todayStr();
  const urgent = status.color === "red";

  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-3xl border shadow-sm overflow-hidden ${
        urgent ? "border-red-200" : "border-border"
      }`}
    >
      <button onClick={onOpen} className="flex w-full items-stretch text-left">
        <div className="relative flex-shrink-0">
          <PlantImg cp={cp} userPhoto={up.photo} emoji={display.emoji} className="w-24 h-24" />
          {urgent && (
            <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <Droplets size={11} className="text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <p className="font-semibold text-foreground text-sm truncate leading-tight">{up.nickname}</p>
              <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-muted-foreground italic truncate mb-2">{display.latinName}</p>
          </div>
          <WaterDropCounter status={status} interval={up.wateringInterval} />
        </div>
      </button>

      <div className="flex border-t border-border">
        <button
          onClick={onWater}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
            urgent ? "text-primary bg-primary/5 font-semibold" : "text-muted-foreground hover:text-primary"
          }`}
        >
          <Droplets size={14} /> Полить
        </button>
        {display.needsMisting && (
          <>
            <div className="w-px bg-border" />
            <button
              onClick={onMist}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                mistToday ? "text-sky-600 bg-sky-50" : "text-muted-foreground hover:text-sky-600"
              }`}
            >
              <Wind size={14} /> {mistToday ? "Опрыснуто ✓" : "Опрыснуть"}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── EXPORT / IMPORT ─────────────────────────────────────────────────────────
function DataSheet({
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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          // add only plants not already present by id
          const existingIds = new Set(plants.map(p => p.id));
          const newPlants = backup.plants.filter(p => !existingIds.has(p.id));
          onImport([...plants, ...newPlants], null, "merge");
          setImportedCount(newPlants.length);
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

// ─── PLANTS SCREEN (shared by Home + Garden tabs) ────────────────────────────
function PlantsScreen({
  location, plants, onWater, onMist, onOpen, onGoCatalog, onOpenData,
}: {
  location: PlantLocation;
  plants: UserPlant[];
  onWater: (up: UserPlant) => void;
  onMist: (id: string) => void;
  onOpen: (up: UserPlant) => void;
  onGoCatalog: () => void;
  onOpenData: () => void;
}) {
  const isHome = location === "home";
  const season = getSeasonLabel(new Date().getMonth() + 1);

  const visible = plants.filter(p => p.location === location);
  const overdue = visible.filter(p => getWateringStatus(p).color === "red").length;
  const sorted = [...visible].sort((a, b) => getWateringStatus(b).urgency - getWateringStatus(a).urgency);

  const title = isHome ? "Дом" : "Сад";
  const emptyEmoji = isHome ? "🪴" : "🌳";
  const emptyText = isHome ? "Нет комнатных растений" : "Нет растений на участке";
  const emptyHint = isHome
    ? "Добавьте цветок или комнатное растение"
    : "Добавьте садовое, огородное или уличное растение";

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>
              {title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {season} · {visible.length} растений
            </p>
          </div>
          <div className="flex items-center gap-2">
            {overdue > 0 && (
              <div className="bg-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                💧 {overdue} ждут
              </div>
            )}
            <button
              onClick={onOpenData}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              title="Данные и резервная копия"
            >
              <Database size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <AnimatePresence mode="wait">
          {sorted.length === 0 ? (
            <motion.div
              key={`empty-${location}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="text-7xl mb-4">{emptyEmoji}</div>
              <p className="text-base font-semibold text-foreground mb-1">{emptyText}</p>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{emptyHint}</p>
              <button onClick={onGoCatalog}
                className="bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl font-medium flex items-center gap-2 mx-auto"
              >
                <BookOpen size={18} /> Открыть каталог
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`list-${location}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {sorted.map(up => (
                <PlantCard key={up.id} up={up}
                  onWater={() => onWater(up)}
                  onMist={() => onMist(up.id)}
                  onOpen={() => onOpen(up)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── ADD PLANT SCREEN ────────────────────────────────────────────────────────
function AddScreen({ onSelectCatalog, onAddCustom }: { onSelectCatalog: (cp: CatalogPlant) => void; onAddCustom: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"identify" | "diagnose" | null>(null);
  const [result, setResult] = useState<CatalogPlant | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [addFilter, setAddFilter] = useState<string | null>(null);
  const filteredCatalog = filterCatalog(CATALOG, catalogQuery, addFilter);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPhoto(reader.result as string); setResult(null); };
    reader.readAsDataURL(file);
  };

  const runScan = (mode: "identify" | "diagnose") => {
    setScanMode(mode);
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      setResult(CATALOG[Math.floor(Math.random() * CATALOG.length)]);
      setScanning(false);
    }, 2200);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Добавить</h1>
        <p className="text-xs text-muted-foreground">Сканируйте или выберите из каталога</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-4">
        {/* Photo upload zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className="relative bg-secondary border-2 border-dashed border-primary/25 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        >
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          {photo ? (
            <div className="relative">
              <img src={photo} alt="Фото" className="w-full h-52 object-cover" />
              <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                <Camera size={11} /> Заменить
              </div>
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera size={28} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Сфотографируйте растение</p>
                <p className="text-xs text-muted-foreground">или выберите из галереи</p>
              </div>
            </div>
          )}
        </div>

        {/* Scan action buttons */}
        <AnimatePresence>
          {photo && !scanning && !result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3"
            >
              <button onClick={() => runScan("identify")}
                className="bg-primary text-primary-foreground rounded-2xl p-4 flex flex-col items-center gap-2"
              >
                <Scan size={22} />
                <span className="text-sm font-medium text-center leading-tight">Определить растение</span>
              </button>
              <button onClick={() => runScan("diagnose")}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 text-foreground"
              >
                <Leaf size={22} className="text-primary" />
                <span className="text-sm font-medium text-center leading-tight">Диагностика листа</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanning animation */}
        {scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-3xl p-8 flex flex-col items-center gap-4"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-[3px] border-primary border-t-transparent"
            />
            <p className="text-sm text-muted-foreground text-center">
              {scanMode === "identify" ? "Определяю растение..." : "Анализирую лист..."}
            </p>
          </motion.div>
        )}

        {/* Identify result */}
        {result && scanMode === "identify" && !scanning && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl overflow-hidden"
          >
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
              <p className="text-sm font-semibold text-emerald-700">✓ Растение определено</p>
            </div>
            <div className="flex items-center gap-3 p-4">
              <PlantImg cp={result} className="w-16 h-16 rounded-2xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{result.name}</p>
                <p className="text-xs text-muted-foreground italic mb-1">{result.latinName}</p>
                <DifficultyBadge d={result.difficulty} />
              </div>
            </div>
            <div className="px-4 pb-4 flex gap-3">
              <button onClick={() => { setResult(null); setPhoto(null); }}
                className="flex-1 py-3 rounded-2xl border border-border text-sm font-medium"
              >
                Повторить
              </button>
              <button onClick={() => onSelectCatalog(result)}
                className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-medium"
              >
                Открыть карточку
              </button>
            </div>
          </motion.div>
        )}

        {/* Diagnose result */}
        {result && scanMode === "diagnose" && !scanning && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl overflow-hidden"
          >
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-sm font-semibold text-amber-700">🔍 Возможные проблемы</p>
            </div>
            <div className="p-4 space-y-2.5">
              {result.diseases.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <p className="text-sm text-foreground">{d}</p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button onClick={() => { setResult(null); setPhoto(null); }}
                className="w-full py-3 rounded-2xl border border-border text-sm font-medium"
              >
                Повторить сканирование
              </button>
            </div>
          </motion.div>
        )}

        {/* Custom plant button */}
        <button
          onClick={onAddCustom}
          className="w-full flex items-center gap-3 bg-secondary border-2 border-dashed border-primary/30 rounded-2xl p-4 text-left"
        >
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Plus size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Добавить своё растение</p>
            <p className="text-xs text-muted-foreground">С фото, описанием — не из каталога</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground ml-auto flex-shrink-0" />
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">каталог растений</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Searchable catalog */}
        <div>
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={catalogQuery}
              onChange={e => setCatalogQuery(e.target.value)}
              placeholder="Поиск по каталогу..."
              className="w-full bg-muted rounded-2xl pl-10 pr-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATALOG_FILTERS.map(f => (
              <button
                key={f.label}
                onClick={() => setAddFilter(f.tag)}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  addFilter === f.tag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredCatalog.map(cp => (
              <button key={cp.id} onClick={() => onSelectCatalog(cp)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3 text-left active:bg-secondary transition-colors"
              >
                <PlantImg cp={cp} className="w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{cp.name}</p>
                  <p className="text-xs text-muted-foreground italic truncate mb-1">{cp.latinName}</p>
                  <DifficultyBadge d={cp.difficulty} />
                </div>
                <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
            {filteredCatalog.length === 0 && (
              <p className="text-center py-6 text-sm text-muted-foreground">Ничего не найдено</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GBIF PANEL ──────────────────────────────────────────────────────────────
function GbifPanel({ latinName }: { latinName: string }) {
  const { data, loading, error } = useGbif(latinName);

  if (loading) {
    return (
      <div className="border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
            GBIF · Загрузка данных...
          </p>
        </div>
        <div className="space-y-2">
          {[80, 60, 70].map(w => (
            <div key={w} className="h-3 rounded-full bg-muted animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-border rounded-2xl p-4 mb-4">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">GBIF</p>
        <p className="text-xs text-muted-foreground">Научные данные недоступны офлайн</p>
      </div>
    );
  }

  const { match, vernacularNames, photos } = data;
  const taxonomy = [
    { label: "Царство", value: match.kingdom },
    { label: "Тип", value: match.phylum },
    { label: "Класс", value: match.class },
    { label: "Порядок", value: match.order },
    { label: "Семейство", value: match.family },
    { label: "Род", value: match.genus },
  ].filter(t => t.value);

  const gbifUrl = `https://www.gbif.org/species/${match.usageKey}`;

  return (
    <div className="border border-primary/20 bg-primary/5 rounded-2xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="#2d5a27" strokeWidth="2"/>
            <path d="M8 16 Q16 6 24 16 Q16 26 8 16Z" fill="#2d5a27" opacity="0.6"/>
          </svg>
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
            GBIF · Наука
          </p>
        </div>
        <a
          href={gbifUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary underline underline-offset-2"
        >
          gbif.org →
        </a>
      </div>

      {/* Taxonomy chain */}
      <div className="flex flex-wrap items-center gap-1 mb-3">
        {taxonomy.map((t, i) => (
          <span key={t.label} className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{t.label}</span>
            <span className="text-[11px] font-semibold text-foreground italic">{t.value}</span>
            {i < taxonomy.length - 1 && (
              <span className="text-muted-foreground text-[10px]">›</span>
            )}
          </span>
        ))}
      </div>

      {/* Confidence badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${match.confidence}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground flex-shrink-0">
          Уверенность {match.confidence}%
        </span>
      </div>

      {/* Vernacular names */}
      {vernacularNames.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
            Названия в мире
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vernacularNames.map(v => (
              <span key={v.language} className="text-[11px] bg-card border border-border rounded-full px-2 py-0.5">
                <span className="text-muted-foreground">
                  {LANG_LABELS[v.language] ?? v.language}:
                </span>{" "}
                <span className="text-foreground font-medium">{v.vernacularName}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* GBIF photos */}
      {photos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
            Фото из наблюдений
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {photos.slice(0, 4).map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <img
                  src={p.identifier}
                  alt={p.title ?? latinName}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {p.creator && (
                  <div className="absolute bottom-0 inset-x-0 bg-foreground/50 px-1.5 py-0.5">
                    <p className="text-[9px] text-white truncate">© {p.creator}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CATALOG DETAIL SHEET ────────────────────────────────────────────────────
function CatalogDetailSheet({
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
            <PlantImg cp={cp} className="w-full h-56" />
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
              <DifficultyBadge d={cp.difficulty} />
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

// ─── ADD TO GARDEN MODAL ─────────────────────────────────────────────────────
function AddToGardenModal({
  cp, photo, defaultLocation = "home", onConfirm, onClose,
}: {
  cp: CatalogPlant;
  photo?: string | null;
  defaultLocation?: PlantLocation;
  onConfirm: (nickname: string, interval: number, location: PlantLocation) => void;
  onClose: () => void;
}) {
  const def = isWinterMonth(new Date().getMonth() + 1) ? cp.watering.winter : cp.watering.summer;
  const [nickname, setNickname] = useState(cp.name);
  const [interval, setWaterInterval] = useState(def);
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

// ─── NOTE CONTENT RENDERER ───────────────────────────────────────────────────
function NoteContent({ content, onToggleChecklist }: { content: string; onToggleChecklist: (lineIndex: number) => void }) {
  const lines = content.split("\n");
  return (
    <div className="text-sm text-foreground space-y-0.5 leading-relaxed">
      {lines.map((line, i) => {
        const kind = getNoteLineKind(line);
        if (kind === "check-done") return (
          <button type="button" key={i} onClick={() => onToggleChecklist(i)} className="flex w-full items-start gap-2 text-left">
            <CheckSquare size={13} className="text-primary mt-0.5 flex-shrink-0" />
            <span className="line-through text-muted-foreground">{line.slice(4)}</span>
          </button>
        );
        if (kind === "check-open") return (
          <button type="button" key={i} onClick={() => onToggleChecklist(i)} className="flex w-full items-start gap-2 text-left">
            <Square size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <span>{line.slice(4)}</span>
          </button>
        );
        if (kind === "bullet") return (
          <div key={i} className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5 text-[10px] flex-shrink-0">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
        return <p key={i}>{line || " "}</p>;
      })}
    </div>
  );
}

// ─── EDIT EXISTING PLANT ─────────────────────────────────────────────────────
function EditPlantModal({ up, onSave, onClose }: {
  up: UserPlant;
  onSave: (changes: Partial<UserPlant>) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const catalogPlant = up.catalogId ? CATALOG.find(plant => plant.id === up.catalogId) : null;
  const [nickname, setNickname] = useState(up.nickname);
  const [wateringInterval, setWateringInterval] = useState(up.wateringInterval);
  const [fertilizingInterval, setFertilizingInterval] = useState(up.fertilizingInterval);
  const [description, setDescription] = useState(up.customDescription ?? "");
  const [photo, setPhoto] = useState<string | null>(up.photo);

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center px-4 pb-8">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        className="relative max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Редактировать растение</h3>
          <button onClick={onClose} aria-label="Закрыть редактирование" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><X size={16} /></button>
        </div>

        <div className="mb-4 overflow-hidden rounded-2xl bg-secondary">
          <PlantImg key={photo ?? "catalog-fallback"} cp={catalogPlant} userPhoto={photo} emoji={up.customEmoji} className="h-40 w-full" />
          <div className="flex gap-2 p-3">
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl bg-card px-3 py-2.5 text-xs font-medium text-primary">
              <ImagePlus size={14} className="mr-1.5 inline" /> {photo ? "Заменить фото" : "Добавить фото"}
            </button>
            {photo && <button onClick={() => setPhoto(null)} className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-500">Удалить</button>}
          </div>
        </div>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Название</label>
        <input value={nickname} onChange={event => setNickname(event.target.value)} className="mb-4 w-full rounded-2xl bg-muted px-4 py-3 text-sm outline-none" />

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Описание</label>
        <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3}
          className="mb-4 w-full resize-none rounded-2xl bg-muted px-4 py-3 text-sm outline-none" placeholder="Особенности ухода или растения" />

        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Полив каждые {wateringInterval} дн.</label>
        <input type="range" min={1} max={60} value={wateringInterval} onChange={event => setWateringInterval(Number(event.target.value))} className="mb-4 w-full accent-primary" />

        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Подкормка каждые {fertilizingInterval} дн.</label>
        <input type="range" min={0} max={90} value={fertilizingInterval} onChange={event => setFertilizingInterval(Number(event.target.value))} className="mb-5 w-full accent-primary" />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-border py-3.5 text-sm font-medium">Отмена</button>
          <button disabled={!nickname.trim()} onClick={() => {
            onSave({ nickname: nickname.trim(), photo, wateringInterval, fertilizingInterval, customDescription: description.trim() || undefined });
            onClose();
          }} className="flex-1 rounded-2xl bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-40">Сохранить</button>
        </div>
      </motion.div>
    </div>
  );
}

function DeletePlantConfirm({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-10">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50"><Trash2 size={21} className="text-red-500" /></div>
        <h3 className="mb-2 text-center text-lg font-bold text-foreground">Удалить растение?</h3>
        <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
          «{name}» и вся история ухода, заметки и напоминания будут удалены. Это действие нельзя отменить.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-border py-3.5 text-sm font-medium">Отмена</button>
          <button onClick={onConfirm} className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-medium text-white">Удалить</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── CUSTOM PLANT MODAL ──────────────────────────────────────────────────────
function CustomPlantModal({
  defaultLocation = "home",
  onConfirm,
  onClose,
}: {
  defaultLocation?: PlantLocation;
  onConfirm: (data: Partial<UserPlant> & { nickname: string; wateringInterval: number; location: PlantLocation }) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [latinName, setLatinName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🌿");
  const [photo, setPhoto] = useState<string | null>(null);
  const [interval, setWaterInterval] = useState(7);
  const [location, setLocation] = useState<PlantLocation>(defaultLocation);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onConfirm({
      nickname: name.trim(),
      wateringInterval: interval,
      location,
      customName: name.trim(),
      customLatinName: latinName.trim(),
      customDescription: description.trim(),
      customEmoji: emoji,
      photo,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative bg-background rounded-t-3xl w-full max-w-md"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-5 pt-2 pb-8 space-y-4 overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Своё растение</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X size={16} />
            </button>
          </div>

          {/* Photo */}
          <div
            onClick={() => fileRef.current?.click()}
            className="relative bg-secondary border-2 border-dashed border-primary/25 rounded-2xl overflow-hidden cursor-pointer h-36 flex items-center justify-center"
          >
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            {photo ? (
              <>
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur rounded-full px-2.5 py-1 text-xs flex items-center gap-1">
                  <Camera size={10} /> Изменить
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImagePlus size={28} className="text-primary" />
                <p className="text-xs text-muted-foreground">Добавить фото (необязательно)</p>
              </div>
            )}
          </div>

          {/* Emoji + Name */}
          <div className="flex gap-2">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Эмодзи</label>
              <input
                value={emoji} onChange={e => setEmoji(e.target.value)}
                className="w-14 bg-muted rounded-xl px-2 py-3 text-center text-xl outline-none"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Название *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Например: Моя петуния"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Латинское название</label>
            <input
              value={latinName} onChange={e => setLatinName(e.target.value)}
              placeholder="Petunia × hybrida (необязательно)"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Описание</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Заметки об особенностях растения..."
              rows={3}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Где растёт?</label>
            <div className="flex bg-muted rounded-2xl p-1 gap-1">
              <button onClick={() => setLocation("home")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${location === "home" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Home size={15} /> Дома
              </button>
              <button onClick={() => setLocation("outdoor")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${location === "outdoor" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Trees size={15} /> На участке
              </button>
            </div>
          </div>

          {/* Interval */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
              Полив каждые <strong className="text-foreground">{interval}</strong> дн.
            </label>
            <input type="range" min={1} max={60} value={interval} onChange={e => setWaterInterval(Number(e.target.value))} className="w-full accent-primary" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-border text-sm font-medium">Отмена</button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              Добавить
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── USER PLANT DETAIL SHEET ─────────────────────────────────────────────────
type PlantTab = "care" | "notes" | "reminders";

function UserPlantSheet({
  up, onClose, onEdit, onRemove, onWater, onMist, onFertilize, onMoveLocation,
  onAddNote, onDeleteNote, onToggleNoteItem, onAddReminder, onToggleReminder, onDeleteReminder,
}: {
  up: UserPlant;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onWater: () => void;
  onMist: () => void;
  onFertilize: () => void;
  onMoveLocation: (loc: PlantLocation) => void;
  onAddNote: (content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleNoteItem: (noteId: string, lineIndex: number) => void;
  onAddReminder: (title: string, date: string) => void;
  onToggleReminder: (reminderId: string) => void;
  onDeleteReminder: (reminderId: string) => void;
}) {
  const cp = up.catalogId ? CATALOG.find(c => c.id === up.catalogId) ?? null : null;
  const display = resolvePlantDisplay(up);
  const status = getWateringStatus(up);
  const [activeTab, setActiveTab] = useState<PlantTab>("care");
  const [noteText, setNoteText] = useState("");
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(todayStr());
  const fertToday = up.fertilizingHistory[up.fertilizingHistory.length - 1] === todayStr();
  const lastFert = up.fertilizingHistory[up.fertilizingHistory.length - 1];
  const fertDaysUntil = up.fertilizingInterval > 0 && lastFert
    ? up.fertilizingInterval - daysSince(lastFert)
    : null;
  const fertOverdue = fertDaysUntil !== null && fertDaysUntil <= 0;

  const addNotePrefix = (prefix: "- " | "[ ] ") => {
    const input = noteInputRef.current;
    const result = insertNotePrefix(noteText, prefix, input?.selectionStart, input?.selectionEnd);
    setNoteText(result.value);
    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(result.cursor, result.cursor);
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative mt-auto bg-background rounded-t-3xl max-h-[93vh] flex flex-col w-full max-w-md mx-auto"
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Hero image */}
          <div className="relative">
            <PlantImg cp={cp} userPhoto={up.photo} emoji={display.emoji} className="w-full h-48" />
            <button onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pt-3">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-foreground leading-tight">{up.nickname}</h2>
                {display.latinName && <p className="text-sm text-muted-foreground italic">{display.latinName}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={onEdit} aria-label="Редактировать растение" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <Pencil size={15} className="text-primary" />
                </button>
                <button onClick={onRemove} aria-label="Удалить растение" className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={15} className="text-red-400" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <StatusBadge s={status} />
              {cp && <DifficultyBadge d={cp.difficulty} />}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${up.location === "home" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>
                {up.location === "home" ? <><Home size={10} /> Дома</> : <><Trees size={10} /> Участок</>}
              </span>
              {fertOverdue && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                  <FlaskConical size={10} /> Удобрить
                </span>
              )}
            </div>

            {/* Location toggle */}
            <div className="flex bg-muted rounded-2xl p-1 gap-1 mb-4">
              {(["home", "outdoor"] as const).map(loc => (
                <button key={loc} onClick={() => onMoveLocation(loc)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${up.location === loc ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {loc === "home" ? <><Home size={13} /> Дома</> : <><Trees size={13} /> На участке</>}
                </button>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex bg-muted rounded-2xl p-1 gap-1 mb-4">
              {([
                { id: "care" as PlantTab, icon: <Droplets size={13} />, label: "Уход" },
                { id: "notes" as PlantTab, icon: <StickyNote size={13} />, label: `Заметки${up.notes.length ? ` (${up.notes.length})` : ""}` },
                { id: "reminders" as PlantTab, icon: <Bell size={13} />, label: `Напомин.${up.reminders.filter(r => !r.done).length ? ` (${up.reminders.filter(r => !r.done).length})` : ""}` },
              ]).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* ─── TAB: CARE ─── */}
            {activeTab === "care" && (
              <div className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Поливов</p>
                    <p className="text-2xl font-bold text-foreground">{up.wateringHistory.length}</p>
                  </div>
                  <div className="bg-secondary rounded-2xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Добавлено</p>
                    <p className="text-sm font-semibold text-foreground">{formatDate(up.addedAt)}</p>
                  </div>
                </div>

                {/* Fertilizing */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <FlaskConical size={11} /> Удобрения
                    </p>
                    {fertDaysUntil !== null && (
                      <span className={`text-xs font-medium ${fertOverdue ? "text-amber-600" : "text-muted-foreground"}`}>
                        {fertOverdue ? `Просрочено ${Math.abs(fertDaysUntil)} дн.` : fertDaysUntil === 0 ? "Сегодня" : `Через ${fertDaysUntil} дн.`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {up.fertilizingHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Ещё не удобрялось</p>
                    ) : (
                      [...up.fertilizingHistory].reverse().slice(0, 6).map((d, i) => (
                        <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                          🌱 {formatDate(d)}
                        </span>
                      ))
                    )}
                  </div>
                  <button onClick={onFertilize} disabled={fertToday}
                    className={`w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${fertToday ? "bg-amber-50 text-amber-600" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                  >
                    <FlaskConical size={13} /> {fertToday ? "Удобрено сегодня ✓" : "Отметить удобрение"}
                  </button>
                </div>

                {/* Watering history */}
                {up.wateringHistory.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">История полива</p>
                    <div className="flex flex-wrap gap-2">
                      {[...up.wateringHistory].reverse().slice(0, 8).map((d, i) => (
                        <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">💧 {formatDate(d)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Misting history */}
                {display.needsMisting && up.mistingHistory.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">История опрыскивания</p>
                    <div className="flex flex-wrap gap-2">
                      {[...up.mistingHistory].reverse().slice(0, 6).map((d, i) => (
                        <span key={i} className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full">💨 {formatDate(d)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {up.customDescription && (
                  <div className="bg-secondary rounded-2xl p-4">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Описание</p>
                    <p className="text-sm text-foreground leading-relaxed">{up.customDescription}</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: NOTES ─── */}
            {activeTab === "notes" && (
              <div className="space-y-3 pb-4">
                {/* Add note */}
                <div className="bg-secondary rounded-2xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Новая заметка
                  </p>
                  <div className="mb-2 flex gap-2">
                    <button type="button" onClick={() => addNotePrefix("- ")} className="flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground border border-border">
                      <List size={13} /> Маркер
                    </button>
                    <button type="button" onClick={() => addNotePrefix("[ ] ")} className="flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground border border-border">
                      <CheckSquare size={13} /> Чекбокс
                    </button>
                  </div>
                  <textarea
                    ref={noteInputRef}
                    value={noteText} onChange={e => setNoteText(e.target.value)}
                    placeholder={"Например:\n- Пересадить весной\n[ ] Купить горшок\nОтцвела 15 июня"}
                    rows={4}
                    className="w-full bg-card rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground resize-none border border-border"
                  />
                  <button
                    onClick={() => { if (noteText.trim()) { onAddNote(noteText.trim()); setNoteText(""); } }}
                    disabled={!noteText.trim()}
                    className="mt-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={13} /> Добавить заметку
                  </button>
                </div>

                {up.notes.length === 0 ? (
                  <div className="text-center py-10">
                    <StickyNote size={32} className="mx-auto text-muted-foreground mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">Нет заметок. Добавьте первую!</p>
                  </div>
                ) : (
                  [...up.notes].reverse().map(note => (
                    <div key={note.id} className="bg-card border border-border rounded-2xl p-3.5 relative group">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[10px] text-muted-foreground">{formatDate(note.createdAt)}</p>
                        <button onClick={() => onDeleteNote(note.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                      <NoteContent content={note.content} onToggleChecklist={lineIndex => onToggleNoteItem(note.id, lineIndex)} />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── TAB: REMINDERS ─── */}
            {activeTab === "reminders" && (
              <div className="space-y-3 pb-4">
                {/* Add reminder */}
                <div className="bg-secondary rounded-2xl p-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Новое напоминание</p>
                  <input
                    value={reminderTitle} onChange={e => setReminderTitle(e.target.value)}
                    placeholder="Что нужно сделать?"
                    className="w-full bg-card rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground border border-border mb-2"
                  />
                  <input
                    type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                    className="w-full bg-card rounded-xl px-3 py-2.5 text-sm outline-none border border-border mb-2"
                  />
                  <button
                    onClick={() => { if (reminderTitle.trim()) { onAddReminder(reminderTitle.trim(), reminderDate); setReminderTitle(""); setReminderDate(todayStr()); } }}
                    disabled={!reminderTitle.trim()}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <Bell size={13} /> Добавить напоминание
                  </button>
                </div>

                {up.reminders.length === 0 ? (
                  <div className="text-center py-10">
                    <Bell size={32} className="mx-auto text-muted-foreground mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">Нет напоминаний</p>
                  </div>
                ) : (
                  [...up.reminders].sort((a, b) => a.date.localeCompare(b.date)).map(r => {
                    const isPast = r.date < todayStr();
                    return (
                      <div key={r.id} className={`bg-card border rounded-2xl p-3.5 flex items-start gap-3 ${r.done ? "border-border opacity-60" : isPast ? "border-red-200 bg-red-50/30" : "border-border"}`}>
                        <button onClick={() => onToggleReminder(r.id)} className="mt-0.5 flex-shrink-0">
                          {r.done
                            ? <CheckSquare size={18} className="text-primary" />
                            : <Square size={18} className="text-muted-foreground" />
                          }
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${r.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{r.title}</p>
                          <p className={`text-xs mt-0.5 ${isPast && !r.done ? "text-red-500" : "text-muted-foreground"}`}>
                            {isPast && !r.done ? "⚠️ " : "📅 "}{formatDate(r.date)}
                          </p>
                        </div>
                        <button onClick={() => onDeleteReminder(r.id)}>
                          <Trash2 size={13} className="text-muted-foreground hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-6 pt-3 border-t border-border bg-background flex gap-3 flex-shrink-0">
          <button onClick={onWater}
            className="flex-1 bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm"
          >
            <Droplets size={16} /> Полить
          </button>
          {display.needsMisting && (
            <button onClick={onMist}
              className="flex-1 bg-sky-100 text-sky-700 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <Wind size={16} /> Опрыснуть
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────
type Tab = "home" | "garden" | "catalog" | "checklist" | "add";

function getInitialTab(): Tab {
  const screen = new URLSearchParams(window.location.search).get("screen");
  return ["home", "garden", "catalog", "checklist", "add"].includes(screen ?? "")
    ? screen as Tab
    : "home";
}

function BottomNav({
  active, onChange, homeCount, gardenCount,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  homeCount: number;
  gardenCount: number;
}) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: "home",      icon: <Home size={20} />,      label: "Дом",      badge: homeCount },
    { id: "garden",    icon: <Trees size={20} />,     label: "Сад",      badge: gardenCount },
    { id: "catalog",   icon: <BookOpen size={20} />,  label: "Каталог" },
    { id: "checklist", icon: <ListChecks size={20} />,label: "Чек-лист" },
    { id: "add",       icon: <Plus size={22} />,      label: "Добавить" },
  ];

  return (
    <nav className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border z-30 flex">
      {tabs.map(t => (
        <button
          key={t.id} onClick={() => onChange(t.id)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
            active === t.id ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {t.id === "add" ? (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              active === "add" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}>
              {t.icon}
            </div>
          ) : (
            <div className="relative">
              {t.icon}
              {t.badge != null && t.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </div>
          )}
          <span className="text-[9px] font-medium leading-none mt-0.5">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const garden = useGarden();
  const { canInstall, install, isOnline } = usePwa();
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const [catalogDetail, setCatalogDetail] = useState<CatalogPlant | null>(null);
  const [addToGarden, setAddToGarden] = useState<CatalogPlant | null>(null);
  const [userDetail, setUserDetail] = useState<UserPlant | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [dataSheetOpen, setDataSheetOpen] = useState(false);
  const [customPlantOpen, setCustomPlantOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserPlant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserPlant | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContext, setAiContext] = useState<AssistantContext | undefined>();

  const homeCount = garden.plants.filter(p => p.location === "home").length;
  const gardenCount = garden.plants.filter(p => p.location === "outdoor").length;

  const handleConfirmAdd = useCallback(
    (nickname: string, interval: number, location: PlantLocation) => {
      if (!addToGarden) return;
      if (addToGarden.source === "gbif") {
        garden.addPlant(null, nickname, interval, pendingPhoto, location, {
          customName: addToGarden.name,
          customLatinName: addToGarden.latinName,
          customDescription: addToGarden.description,
          customEmoji: addToGarden.emoji,
          externalTaxon: toExternalTaxon(addToGarden),
        });
      } else {
        garden.addPlant(addToGarden.id, nickname, interval, pendingPhoto, location);
      }
      setAddToGarden(null);
      setCatalogDetail(null);
      setPendingPhoto(null);
      setTab(location === "home" ? "home" : "garden");
    },
    [addToGarden, pendingPhoto, garden]
  );

  const handleConfirmCustom = useCallback(
    (data: Partial<UserPlant> & { nickname: string; wateringInterval: number; location: PlantLocation }) => {
      const { nickname, wateringInterval, location, ...extra } = data;
      garden.addPlant(null, nickname, wateringInterval, extra.photo ?? null, location, extra);
      setCustomPlantOpen(false);
      setTab(location === "home" ? "home" : "garden");
    },
    [garden]
  );

  const sharedScreenProps = {
    onWater: (plant: UserPlant) => garden.waterPlant(plant.id),
    onMist: garden.mistPlant,
    onOpen: setUserDetail,
    onGoCatalog: () => setTab("catalog"),
    onOpenData: () => setDataSheetOpen(true),
  };

  const liveDetail = userDetail ? (garden.plants.find(p => p.id === userDetail.id) ?? userDetail) : null;

  return (
    <div className="app-shell relative w-full h-full max-w-md mx-auto bg-background overflow-hidden flex flex-col">
      <div aria-live="polite" className="absolute top-3 inset-x-3 z-50 flex flex-col gap-2 pointer-events-none">
        {!isOnline && (
          <div className="self-center flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-xs font-medium shadow-lg">
            <WifiOff size={14} /> Офлайн-режим: ваши данные доступны
          </div>
        )}
        {canInstall && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-card border border-border p-3 shadow-xl">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Smartphone size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">Установить PlantCare</p>
              <p className="text-[10px] text-muted-foreground">Работает с главного экрана и без сети</p>
            </div>
            <button onClick={install} className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">
              Установить
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "home" && <PlantsScreen location="home" plants={garden.plants} {...sharedScreenProps} />}
        {tab === "garden" && <PlantsScreen location="outdoor" plants={garden.plants} {...sharedScreenProps} />}
        {tab === "catalog" && <CatalogScreen onSelect={cp => setCatalogDetail(cp)} />}
        {tab === "checklist" && <ChecklistScreen />}
        {tab === "add" && (
          <AddScreen
            onSelectCatalog={cp => setCatalogDetail(cp)}
            onAddCustom={() => setCustomPlantOpen(true)}
          />
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} homeCount={homeCount} gardenCount={gardenCount} />

      {!aiOpen && (
        <button
          onClick={() => {
            if (liveDetail) {
              const display = resolvePlantDisplay(liveDetail);
              setAiContext({
                name: display.name,
                latinName: display.latinName,
                wateringInterval: liveDetail.wateringInterval,
                description: liveDetail.customDescription,
              });
            } else {
              setAiContext(undefined);
            }
            setAiOpen(true);
          }}
          aria-label="Открыть ИИ Садовода"
          title="ИИ Садовод"
          className="absolute bottom-20 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-background/80 transition-transform active:scale-95"
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        >
          <Bot size={21} />
        </button>
      )}

      <AnimatePresence>
        {catalogDetail && !addToGarden && (
          <CatalogDetailSheet key="cat-detail" cp={catalogDetail}
            onClose={() => setCatalogDetail(null)}
            onAddToGarden={() => setAddToGarden(catalogDetail)}
          />
        )}
        {addToGarden && (
          <AddToGardenModal key="add-modal" cp={addToGarden} photo={pendingPhoto}
            defaultLocation={tab === "garden" ? "outdoor" : "home"}
            onConfirm={handleConfirmAdd}
            onClose={() => setAddToGarden(null)}
          />
        )}
        {customPlantOpen && (
          <CustomPlantModal key="custom-plant"
            defaultLocation={tab === "garden" ? "outdoor" : "home"}
            onConfirm={handleConfirmCustom}
            onClose={() => setCustomPlantOpen(false)}
          />
        )}
        {liveDetail && (
          <UserPlantSheet key="user-detail"
            up={liveDetail}
            onClose={() => setUserDetail(null)}
            onEdit={() => setEditTarget(liveDetail)}
            onRemove={() => setDeleteTarget(liveDetail)}
            onWater={() => garden.waterPlant(liveDetail.id)}
            onMist={() => { garden.mistPlant(liveDetail.id); }}
            onFertilize={() => garden.fertilizePlant(liveDetail.id)}
            onMoveLocation={loc => garden.updatePlant(liveDetail.id, { location: loc })}
            onAddNote={content => garden.addNote(liveDetail.id, content)}
            onDeleteNote={noteId => garden.deleteNote(liveDetail.id, noteId)}
            onToggleNoteItem={(noteId, lineIndex) => {
              const note = liveDetail.notes.find(item => item.id === noteId);
              if (note) garden.updateNote(liveDetail.id, noteId, toggleChecklistLine(note.content, lineIndex));
            }}
            onAddReminder={(title, date) => garden.addReminder(liveDetail.id, title, date)}
            onToggleReminder={rid => garden.toggleReminder(liveDetail.id, rid)}
            onDeleteReminder={rid => garden.deleteReminder(liveDetail.id, rid)}
          />
        )}
        {editTarget && (
          <EditPlantModal key="edit-plant"
            up={garden.plants.find(plant => plant.id === editTarget.id) ?? editTarget}
            onSave={changes => garden.updatePlant(editTarget.id, changes)}
            onClose={() => setEditTarget(null)}
          />
        )}
        {deleteTarget && (
          <DeletePlantConfirm key="delete-plant"
            name={deleteTarget.nickname}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => {
              garden.removePlant(deleteTarget.id);
              setDeleteTarget(null);
              setEditTarget(null);
              setUserDetail(null);
            }}
          />
        )}
        {aiOpen && (
          <AiAssistantSheet key="ai-sheet"
            context={aiContext}
            onClose={() => { setAiOpen(false); setAiContext(undefined); }}
          />
        )}
        {dataSheetOpen && (
          <DataSheet key="data-sheet"
            plants={garden.plants}
            settings={{
              ...DEFAULT_SETTINGS,
              lastActiveTab: tab,
            }}
            onImport={(plants, importedSettings, mode) => {
              garden.replacePlants(plants);
              if (mode === "replace" && importedSettings) setTab(importedSettings.lastActiveTab);
            }}
            onClose={() => setDataSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
