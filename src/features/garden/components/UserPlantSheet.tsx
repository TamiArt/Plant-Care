import {
  useRef,
  useState,
} from "react";
import { motion } from "motion/react";
import {
  Bell,
  CheckSquare,
  Droplets,
  FlaskConical,
  Home,
  Lightbulb,
  List,
  Pencil,
  Plus,
  Square,
  StickyNote,
  Trash2,
  Trees,
  Wind,
  X,
} from "lucide-react";
import {
  PlantImage,
  type PlantImageSource,
} from "../../../shared/components/PlantImage";
import {
  formatSupplementalLight,
  isMistingEnabled,
} from "../model/carePreferences";
import { isMistedToday } from "../model/misting";
import { getLatestPlantPhotoId } from "../model/photos";
import {
  daysSince,
  getWateringStatus,
  type WateringStatus,
} from "../model/watering";
import { insertNotePrefix } from "../noteUtils";
import type {
  PlantDisplay,
  PlantLocation,
  UserPlant,
} from "../types";
import { NoteContent } from "./NoteContent";
import { PlantPhotoGallery } from "./PlantPhotoGallery";

type PlantTab =
  | "care"
  | "notes"
  | "reminders";
type Difficulty =
  | "easy"
  | "medium"
  | "hard";

function todayStr(): string {
  return new Date()
    .toISOString()
    .split("T")[0];
}

function formatDate(
  dateStr: string,
): string {
  return new Date(dateStr)
    .toLocaleDateString(
      "ru-RU",
      {
        day: "numeric",
        month: "short",
      },
    );
}

function StatusBadge({
  s,
}: {
  s: WateringStatus;
}) {
  const cls = {
    green:
      "bg-emerald-100 text-emerald-700",
    yellow:
      "bg-amber-100 text-amber-700",
    red:
      "bg-red-100 text-red-700",
    gray:
      "bg-secondary text-secondary-foreground",
  }[s.color];

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {s.label}
    </span>
  );
}

function DifficultyBadge({
  d,
}: {
  d: Difficulty;
}) {
  const map = {
    easy: {
      label: "Простой",
      cls: "bg-emerald-100 text-emerald-700",
    },
    medium: {
      label: "Средний",
      cls: "bg-amber-100 text-amber-700",
    },
    hard: {
      label: "Дива ⚠️",
      cls: "bg-red-100 text-red-700",
    },
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[d].cls}`}
    >
      {map[d].label}
    </span>
  );
}

export function UserPlantSheet({
  up,
  display,
  catalogPlant,
  difficulty,
  onClose,
  onEdit,
  onRemove,
  onWater,
  onMist,
  onFertilize,
  onMoveLocation,
  onAddNote,
  onDeleteNote,
  onToggleNoteItem,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
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
  onMoveLocation: (
    loc: PlantLocation,
  ) => void;
  onAddNote: (
    content: string,
  ) => void;
  onDeleteNote: (
    noteId: string,
  ) => void;
  onToggleNoteItem: (
    noteId: string,
    lineIndex: number,
  ) => void;
  onAddReminder: (
    title: string,
    date: string,
  ) => void;
  onToggleReminder: (
    reminderId: string,
  ) => void;
  onDeleteReminder: (
    reminderId: string,
  ) => void;
}) {
  const status =
    getWateringStatus(up);
  const [activeTab, setActiveTab] =
    useState<PlantTab>("care");
  const [noteText, setNoteText] =
    useState("");
  const noteInputRef =
    useRef<HTMLTextAreaElement>(null);
  const [
    reminderTitle,
    setReminderTitle,
  ] = useState("");
  const [
    reminderDate,
    setReminderDate,
  ] = useState(todayStr());

  const mistingEnabled =
    isMistingEnabled(up);
  const mistToday =
    isMistedToday(
      up.mistingHistory,
    );
  const fertToday =
    up.fertilizingHistory[
      up.fertilizingHistory.length - 1
    ] === todayStr();
  const lastFert =
    up.fertilizingHistory[
      up.fertilizingHistory.length - 1
    ];
  const fertDaysUntil =
    up.fertilizingInterval > 0 &&
    lastFert
      ? up.fertilizingInterval -
        daysSince(lastFert)
      : null;
  const fertOverdue =
    fertDaysUntil !== null &&
    fertDaysUntil <= 0;

  const addNotePrefix = (
    prefix: "- " | "[ ] ",
  ) => {
    const input =
      noteInputRef.current;
    const result =
      insertNotePrefix(
        noteText,
        prefix,
        input?.selectionStart,
        input?.selectionEnd,
      );

    setNoteText(result.value);

    window.requestAnimationFrame(
      () => {
        input?.focus();
        input?.setSelectionRange(
          result.cursor,
          result.cursor,
        );
      },
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
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
        className="relative mx-auto mt-auto flex max-h-[93vh] w-full max-w-md flex-col rounded-t-3xl bg-background"
      >
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative">
            <PlantImage
              catalogPlant={catalogPlant}
              photoId={
                getLatestPlantPhotoId(up)
              }
              emoji={display.emoji}
              className="h-48 w-full"
            />
            <button
              onClick={onClose}
              aria-label="Закрыть карточку"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur"
            >
              <X size={18} />
            </button>
          </div>

          <PlantPhotoGallery
            plant={up}
          />

          <div className="px-5 pt-3">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold leading-tight text-foreground">
                  {up.nickname}
                </h2>
                {display.latinName && (
                  <p className="text-sm italic text-muted-foreground">
                    {display.latinName}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  aria-label="Редактировать растение"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary"
                >
                  <Pencil
                    size={15}
                    className="text-primary"
                  />
                </button>
                <button
                  onClick={onRemove}
                  aria-label="Удалить растение"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-50"
                >
                  <Trash2
                    size={15}
                    className="text-red-400"
                  />
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge s={status} />
              {difficulty && (
                <DifficultyBadge
                  d={difficulty}
                />
              )}
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  up.location === "home"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {up.location === "home" ? (
                  <>
                    <Home size={10} /> Дома
                  </>
                ) : (
                  <>
                    <Trees size={10} /> Участок
                  </>
                )}
              </span>
              {fertOverdue && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <FlaskConical size={10} />
                  Удобрить
                </span>
              )}
              {mistingEnabled && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    mistToday
                      ? "bg-sky-100 text-sky-700"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Wind size={10} />
                  {mistToday
                    ? "Опрыснуто сегодня"
                    : "Не опрыснуто сегодня"}
                </span>
              )}
              {up.supplementalLight && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Lightbulb size={10} />
                  {formatSupplementalLight(
                    up.supplementalLight,
                  )}
                </span>
              )}
            </div>

            <div className="mb-4 flex gap-1 rounded-2xl bg-muted p-1">
              {(
                [
                  "home",
                  "outdoor",
                ] as const
              ).map(loc => (
                <button
                  key={loc}
                  onClick={() =>
                    onMoveLocation(loc)
                  }
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all ${
                    up.location === loc
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {loc === "home" ? (
                    <>
                      <Home size={13} />
                      Дома
                    </>
                  ) : (
                    <>
                      <Trees size={13} />
                      На участке
                    </>
                  )}
                </button>
              ))}
            </div>

            <div className="mb-4 flex gap-1 rounded-2xl bg-muted p-1">
              {[
                {
                  id: "care" as PlantTab,
                  icon: <Droplets size={13} />,
                  label: "Уход",
                },
                {
                  id: "notes" as PlantTab,
                  icon: <StickyNote size={13} />,
                  label: `Заметки${
                    up.notes.length
                      ? ` (${up.notes.length})`
                      : ""
                  }`,
                },
                {
                  id: "reminders" as PlantTab,
                  icon: <Bell size={13} />,
                  label: `Напомин.${
                    up.reminders.filter(
                      reminder =>
                        !reminder.done,
                    ).length
                      ? ` (${up.reminders.filter(
                          reminder =>
                            !reminder.done,
                        ).length})`
                      : ""
                  }`,
                },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "care" && (
              <div className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-secondary p-3">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Поливов
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {up.wateringHistory.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-secondary p-3">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Добавлено
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(up.addedAt)}
                    </p>
                  </div>
                </div>

                {up.supplementalLight && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      <Lightbulb size={11} />
                      Доп. освещение
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      Ежедневно {formatSupplementalLight(
                        up.supplementalLight,
                      )}
                    </p>
                  </div>
                )}

                {mistingEnabled && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Wind size={11} />
                        Опрыскивание
                      </p>
                      <span
                        className={`text-xs font-medium ${
                          mistToday
                            ? "text-sky-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {mistToday
                          ? "Опрыснуто сегодня ✓"
                          : "Сегодня ещё не опрыскивали"}
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {up.mistingHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Опрыскиваний пока нет
                        </p>
                      ) : (
                        [...up.mistingHistory]
                          .reverse()
                          .slice(0, 6)
                          .map((date, index) => (
                            <span
                              key={`${date}-${index}`}
                              className="rounded-full bg-sky-100 px-2.5 py-1 text-xs text-sky-700"
                            >
                              💨 {formatDate(date)}
                            </span>
                          ))
                      )}
                    </div>
                    <button
                      onClick={onMist}
                      disabled={mistToday}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                        mistToday
                          ? "bg-sky-50 text-sky-600"
                          : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                      }`}
                    >
                      <Wind size={13} />
                      {mistToday
                        ? "Опрыснуто сегодня ✓"
                        : "Отметить опрыскивание"}
                    </button>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      <FlaskConical size={11} />
                      Удобрения
                    </p>
                    {fertDaysUntil !== null && (
                      <span
                        className={`text-xs font-medium ${
                          fertOverdue
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {fertOverdue
                          ? `Просрочено ${Math.abs(
                              fertDaysUntil,
                            )} дн.`
                          : fertDaysUntil === 0
                            ? "Сегодня"
                            : `Через ${fertDaysUntil} дн.`}
                      </span>
                    )}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {up.fertilizingHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Ещё не удобрялось
                      </p>
                    ) : (
                      [...up.fertilizingHistory]
                        .reverse()
                        .slice(0, 6)
                        .map((date, index) => (
                          <span
                            key={`${date}-${index}`}
                            className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700"
                          >
                            🌱 {formatDate(date)}
                          </span>
                        ))
                    )}
                  </div>
                  <button
                    onClick={onFertilize}
                    disabled={fertToday}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors ${
                      fertToday
                        ? "bg-amber-50 text-amber-600"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    <FlaskConical size={13} />
                    {fertToday
                      ? "Удобрено сегодня ✓"
                      : "Отметить удобрение"}
                  </button>
                </div>

                {up.wateringHistory.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      История полива
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...up.wateringHistory]
                        .reverse()
                        .slice(0, 8)
                        .map((date, index) => (
                          <span
                            key={`${date}-${index}`}
                            className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                          >
                            💧 {formatDate(date)}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {up.customDescription && (
                  <div className="rounded-2xl bg-secondary p-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Описание
                    </p>
                    <p className="text-sm leading-relaxed text-foreground">
                      {up.customDescription}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "notes" && (
              <div className="space-y-3 pb-4">
                <div className="rounded-2xl bg-secondary p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Новая заметка
                  </p>
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        addNotePrefix("- ")
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground"
                    >
                      <List size={13} />
                      Маркер
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addNotePrefix("[ ] ")
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground"
                    >
                      <CheckSquare size={13} />
                      Чекбокс
                    </button>
                  </div>
                  <textarea
                    ref={noteInputRef}
                    value={noteText}
                    onChange={event =>
                      setNoteText(
                        event.target.value,
                      )
                    }
                    placeholder={"Например:\n- Пересадить весной\n[ ] Купить горшок\nОтцвела 15 июня"}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => {
                      if (noteText.trim()) {
                        onAddNote(
                          noteText.trim(),
                        );
                        setNoteText("");
                      }
                    }}
                    disabled={!noteText.trim()}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                  >
                    <Plus size={13} />
                    Добавить заметку
                  </button>
                </div>

                {up.notes.length === 0 ? (
                  <div className="py-10 text-center">
                    <StickyNote
                      size={32}
                      className="mx-auto mb-2 text-muted-foreground opacity-40"
                    />
                    <p className="text-sm text-muted-foreground">
                      Нет заметок. Добавьте первую!
                    </p>
                  </div>
                ) : (
                  [...up.notes]
                    .reverse()
                    .map(note => (
                      <div
                        key={note.id}
                        className="group relative rounded-2xl border border-border bg-card p-3.5"
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(
                              note.createdAt,
                            )}
                          </p>
                          <button
                            onClick={() =>
                              onDeleteNote(
                                note.id,
                              )
                            }
                            className="opacity-50 transition-opacity hover:opacity-100"
                          >
                            <Trash2
                              size={12}
                              className="text-red-400"
                            />
                          </button>
                        </div>
                        <NoteContent
                          content={note.content}
                          onToggleChecklist={lineIndex =>
                            onToggleNoteItem(
                              note.id,
                              lineIndex,
                            )
                          }
                        />
                      </div>
                    ))
                )}
              </div>
            )}

            {activeTab === "reminders" && (
              <div className="space-y-3 pb-4">
                <div className="rounded-2xl bg-secondary p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Новое напоминание
                  </p>
                  <input
                    value={reminderTitle}
                    onChange={event =>
                      setReminderTitle(
                        event.target.value,
                      )
                    }
                    placeholder="Что нужно сделать?"
                    className="mb-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={event =>
                      setReminderDate(
                        event.target.value,
                      )
                    }
                    className="mb-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none"
                  />
                  <button
                    onClick={() => {
                      if (
                        reminderTitle.trim()
                      ) {
                        onAddReminder(
                          reminderTitle.trim(),
                          reminderDate,
                        );
                        setReminderTitle("");
                        setReminderDate(
                          todayStr(),
                        );
                      }
                    }}
                    disabled={
                      !reminderTitle.trim()
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
                  >
                    <Bell size={13} />
                    Добавить напоминание
                  </button>
                </div>

                {up.reminders.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell
                      size={32}
                      className="mx-auto mb-2 text-muted-foreground opacity-40"
                    />
                    <p className="text-sm text-muted-foreground">
                      Нет напоминаний
                    </p>
                  </div>
                ) : (
                  [...up.reminders]
                    .sort((a, b) =>
                      a.date.localeCompare(
                        b.date,
                      ),
                    )
                    .map(reminder => {
                      const isPast =
                        reminder.date <
                        todayStr();

                      return (
                        <div
                          key={reminder.id}
                          className={`flex items-start gap-3 rounded-2xl border p-3.5 ${
                            reminder.done
                              ? "border-border bg-card opacity-60"
                              : isPast
                                ? "border-red-200 bg-red-50/30"
                                : "border-border bg-card"
                          }`}
                        >
                          <button
                            onClick={() =>
                              onToggleReminder(
                                reminder.id,
                              )
                            }
                            className="mt-0.5 flex-shrink-0"
                          >
                            {reminder.done ? (
                              <CheckSquare
                                size={18}
                                className="text-primary"
                              />
                            ) : (
                              <Square
                                size={18}
                                className="text-muted-foreground"
                              />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium leading-tight ${
                                reminder.done
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {reminder.title}
                            </p>
                            <p
                              className={`mt-0.5 text-xs ${
                                isPast &&
                                !reminder.done
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isPast &&
                              !reminder.done
                                ? "⚠️ "
                                : "📅 "}
                              {formatDate(
                                reminder.date,
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              onDeleteReminder(
                                reminder.id,
                              )
                            }
                          >
                            <Trash2
                              size={13}
                              className="text-muted-foreground transition-colors hover:text-red-400"
                            />
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-3 border-t border-border bg-background px-5 pb-6 pt-3">
          <button
            onClick={onWater}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
          >
            <Droplets size={16} />
            Полить
          </button>
          {mistingEnabled && (
            <button
              onClick={onMist}
              disabled={mistToday}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold ${
                mistToday
                  ? "bg-sky-50 text-sky-600"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              <Wind size={16} />
              {mistToday
                ? "Опрыснуто ✓"
                : "Опрыснуть"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
