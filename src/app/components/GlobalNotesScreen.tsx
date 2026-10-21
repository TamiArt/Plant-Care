import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Pencil, Plus, Save, StickyNote, Trash2, X } from "lucide-react";
import { getMetaValue, setMetaValue } from "../../features/garden/repository/gardenRepository";

export interface GlobalCareNote {
  id: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "garden:globalCareNotes";

function todayLocal(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function createId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizeNotes(value: unknown): GlobalCareNote[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is GlobalCareNote => {
    if (!item || typeof item !== "object") return false;
    const note = item as Partial<GlobalCareNote>;
    return typeof note.id === "string"
      && typeof note.date === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(note.date)
      && typeof note.content === "string"
      && typeof note.createdAt === "string"
      && typeof note.updatedAt === "string";
  }).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

export function useGlobalCareNotes() {
  const [notes, setNotes] = useState<GlobalCareNote[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getMetaValue<unknown>(STORAGE_KEY)
      .then(value => {
        if (active) setNotes(normalizeNotes(value));
      })
      .catch(() => {
        if (active) setError("Не удалось загрузить общие заметки.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const commit = useCallback(async (next: GlobalCareNote[]) => {
    const normalized = normalizeNotes(next);
    try {
      await setMetaValue(STORAGE_KEY, normalized);
      setNotes(normalized);
      setError(null);
      return true;
    } catch {
      setError("Не удалось сохранить заметку. Проверьте свободное место в браузере.");
      return false;
    }
  }, []);

  const addNote = useCallback(async (content: string, date: string) => {
    const trimmed = content.trim();
    if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const now = new Date().toISOString();
    return commit([{
      id: createId(),
      date,
      content: trimmed,
      createdAt: now,
      updatedAt: now,
    }, ...notes]);
  }, [commit, notes]);

  const updateNote = useCallback(async (id: string, content: string, date: string) => {
    const trimmed = content.trim();
    if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const now = new Date().toISOString();
    return commit(notes.map(note => note.id === id
      ? { ...note, content: trimmed, date, updatedAt: now }
      : note));
  }, [commit, notes]);

  const deleteNote = useCallback(async (id: string) => {
    return commit(notes.filter(note => note.id !== id));
  }, [commit, notes]);

  const replaceNotes = useCallback(async (incoming: GlobalCareNote[], mode: "replace" | "merge") => {
    return commit(mode === "replace"
      ? incoming
      : [...notes, ...incoming.filter(note => !notes.some(existing => existing.id === note.id))]);
  }, [commit, notes]);

  return { notes, ready, error, addNote, updateNote, deleteNote, replaceNotes };
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

export function GlobalNotesScreen({
  notes, ready, error, onAdd, onUpdate, onDelete,
}: {
  notes: GlobalCareNote[];
  ready: boolean;
  error: string | null;
  onAdd: (content: string, date: string) => Promise<boolean>;
  onUpdate: (id: string, content: string, date: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");
  const [date, setDate] = useState(todayLocal);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState(todayLocal);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    const saved = await onAdd(content, date);
    if (saved) { setContent(""); setDate(todayLocal()); }
    setSaving(false);
  };

  const startEdit = (note: GlobalCareNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditDate(note.date);
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim() || saving) return;
    setSaving(true);
    const saved = await onUpdate(id, editContent, editDate);
    if (saved) setEditingId(null);
    setSaving(false);
  };

  return (
    <section className="h-full overflow-y-auto px-4 pb-28 pt-5 sm:px-6">
      <header className="mx-auto mb-5 max-w-2xl">
        <div className="mb-1 flex items-center gap-2">
          <StickyNote size={23} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Общие заметки</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Записывайте уход сразу за всей коллекцией: обработки от вредителей, подкормки, пересадки и наблюдения.
        </p>
      </header>

      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-border bg-secondary/70 p-4">
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CalendarDays size={14} /> Дата события
          </label>
          <input type="date" value={date} onChange={event => setDate(event.target.value)}
            className="mb-3 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none" />
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Заметка</label>
          <textarea value={content} onChange={event => setContent(event.target.value)}
            placeholder="Например: 15 октября обработала все растения от паутинного клеща препаратом …"
            rows={4} className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
          <button type="button" onClick={() => void handleAdd()} disabled={!content.trim() || saving || !ready}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
            <Plus size={16} /> Добавить общую заметку
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!ready ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Загружаем заметки…</p>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
            <StickyNote size={30} className="mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm font-medium text-foreground">Пока нет общих заметок</p>
            <p className="mt-1 text-xs text-muted-foreground">Первая запись может относиться сразу ко всем растениям.</p>
          </div>
        ) : (
          notes.map(note => (
            <article key={note.id} className="rounded-2xl border border-border bg-card p-4">
              {editingId === note.id ? (
                <>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Дата события</label>
                  <input type="date" value={editDate} onChange={event => setEditDate(event.target.value)}
                    className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                  <textarea value={editContent} onChange={event => setEditContent(event.target.value)} rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => void handleUpdate(note.id)} disabled={!editContent.trim() || saving}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"><Save size={14} /> Сохранить</button>
                    <button type="button" onClick={() => setEditingId(null)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm"><X size={14} /> Отмена</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-primary">{formatDate(note.date)}</p>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => startEdit(note)} aria-label="Редактировать заметку" className="text-muted-foreground hover:text-foreground"><Pencil size={15} /></button>
                      <button type="button" onClick={() => {
                        if (window.confirm("Удалить эту общую заметку?")) void onDelete(note.id);
                      }} aria-label="Удалить заметку" className="text-muted-foreground hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{note.content}</p>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
