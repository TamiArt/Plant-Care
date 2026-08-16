import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Bell, CheckSquare, Droplets, FlaskConical, Home, List, Pencil, Plus, Square, StickyNote, Trash2, Trees, Wind, X } from "lucide-react";
import { PlantImage, type PlantImageSource } from "../../../shared/components/PlantImage";
import { isMistedToday } from "../model/misting";
import { daysSince, getWateringStatus, type WateringStatus } from "../model/watering";
import { insertNotePrefix } from "../noteUtils";
import type { PlantDisplay, PlantLocation, UserPlant } from "../types";
import { NoteContent } from "./NoteContent";

type PlantTab = "care" | "notes" | "reminders";
type Difficulty = "easy" | "medium" | "hard";
function todayStr(): string { return new Date().toISOString().split("T")[0]; }
function formatDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }); }
function StatusBadge({ s }: { s: WateringStatus }) { const cls = { green: "bg-emerald-100 text-emerald-700", yellow: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-700", gray: "bg-secondary text-secondary-foreground" }[s.color]; return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{s.label}</span>; }
function DifficultyBadge({ d }: { d: Difficulty }) { const map = { easy: { label: "Простой", cls: "bg-emerald-100 text-emerald-700" }, medium: { label: "Средний", cls: "bg-amber-100 text-amber-700" }, hard: { label: "Дива ⚠️", cls: "bg-red-100 text-red-700" } }; return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[d].cls}`}>{map[d].label}</span>; }

export function UserPlantSheet({
  up, display, catalogPlant, difficulty, onClose, onEdit, onRemove, onWater, onMist, onFertilize, onMoveLocation,
  onAddNote, onDeleteNote, onToggleNoteItem, onAddReminder, onToggleReminder, onDeleteReminder,
}: {
  up: UserPlant;
  display: PlantDisplay;
  catalogPlant?: PlantImageSource | null;
  difficulty?: Difficulty;
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
  const status = getWateringStatus(up);
  const [activeTab, setActiveTab] = useState<PlantTab>("care");
  const [noteText, setNoteText] = useState("");
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(todayStr());
  const fertToday = up.fertilizingHistory[up.fertilizingHistory.length - 1] === todayStr();
  const mistToday = isMistedToday(up.mistingHistory);
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
            <PlantImage catalogPlant={catalogPlant} photoId={up.photoId} emoji={display.emoji} className="w-full h-48" />
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
              {difficulty && <DifficultyBadge d={difficulty} />}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${up.location === "home" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>
                {up.location === "home" ? <><Home size={10} /> Дома</> : <><Trees size={10} /> Участок</>}
              </span>
              {fertOverdue && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                  <FlaskConical size={10} /> Удобрить
                </span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${mistToday ? "bg-sky-100 text-sky-700" : "bg-secondary text-muted-foreground"}`}>
                <Wind size={10} /> {mistToday ? "Опрыснуто сегодня" : "Не опрыснуто сегодня"}
              </span>
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

                {/* Misting */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Wind size={11} /> Опрыскивание
                    </p>
                    <span className={`text-xs font-medium ${mistToday ? "text-sky-600" : "text-muted-foreground"}`}>
                      {mistToday ? "Опрыснуто сегодня ✓" : "Сегодня ещё не опрыскивали"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {up.mistingHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Опрыскиваний пока нет</p>
                    ) : (
                      [...up.mistingHistory].reverse().slice(0, 6).map((date, index) => (
                        <span key={`${date}-${index}`} className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full">
                          💨 {formatDate(date)}
                        </span>
                      ))
                    )}
                  </div>
                  <button onClick={onMist} disabled={mistToday}
                    className={`w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${mistToday ? "bg-sky-50 text-sky-600" : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`}
                  >
                    <Wind size={13} /> {mistToday ? "Опрыснуто сегодня ✓" : "Отметить опрыскивание"}
                  </button>
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
          <button onClick={onMist} disabled={mistToday}
            className={`flex-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm ${mistToday ? "bg-sky-50 text-sky-600" : "bg-sky-100 text-sky-700"}`}
          >
            <Wind size={16} /> {mistToday ? "Опрыснуто ✓" : "Опрыснуть"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
