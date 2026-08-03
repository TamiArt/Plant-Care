import { useState } from "react";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { CATALOG } from "./data";
import { useGbifSearch } from "./gbif";
import type { CatalogPlant } from "./types";

export const CATALOG_FILTERS = [
  { label: "Все", tag: null }, { label: "🏠 Комнатные", tag: "комнатный" },
  { label: "🌹 Розы", tag: "роза" }, { label: "🌲 Хвойные", tag: "хвойный" },
  { label: "🌸 Кустарники", tag: "кустарник" }, { label: "🌿 Зелень", tag: "зелень" },
  { label: "🥕 Огород", tag: "огород" }, { label: "🍓 Ягоды", tag: "ягода" },
  { label: "🍎 Плодовые", tag: "плодовый" },
];

function CatalogImage({ plant }: { plant: CatalogPlant }) {
  const [failed, setFailed] = useState(false);
  if (plant.unsplashId && !failed) return (
    <img src={`https://images.unsplash.com/${plant.unsplashId}?w=400&h=400&fit=crop&auto=format`}
      alt={plant.name} className="aspect-square w-full bg-secondary object-cover" onError={() => setFailed(true)} />
  );
  return <div className="flex aspect-square w-full items-center justify-center bg-secondary text-4xl">{plant.emoji}</div>;
}

function DifficultyBadge({ value }: { value: CatalogPlant["difficulty"] }) {
  const styles = {
    easy: ["Простой", "bg-emerald-100 text-emerald-700"], medium: ["Средний", "bg-amber-100 text-amber-700"],
    hard: ["Дива ⚠️", "bg-red-100 text-red-700"],
  } as const;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[value][1]}`}>{styles[value][0]}</span>;
}

export function CatalogScreen({ onSelect }: { onSelect: (plant: CatalogPlant) => void }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const global = useGbifSearch(query);
  const normalized = query.toLocaleLowerCase().trim();
  const filtered = CATALOG.filter(plant =>
    (activeFilter === null || plant.tags.includes(activeFilter)) &&
    (!normalized || plant.name.toLocaleLowerCase().includes(normalized) || plant.latinName.toLocaleLowerCase().includes(normalized) || plant.tags.some(tag => tag.includes(normalized)))
  );

  return <div className="flex h-full flex-col">
    <header className="flex-shrink-0 px-5 pb-3 pt-5">
      <h1 className="mb-3 text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Каталог</h1>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Название или латинское имя..."
          className="w-full rounded-2xl bg-muted py-3 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground" />
      </div>
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
        {CATALOG_FILTERS.map(filter => <button key={filter.label} onClick={() => setActiveFilter(filter.tag)}
          className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === filter.tag ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
          {filter.label}
        </button>)}
      </div>
    </header>

    <main className="flex-1 overflow-y-auto px-5 pb-28">
      <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-xs font-semibold text-primary">🌍 Глобальный справочник растений</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">От 3 букв: редакционные карточки PlantCare и таксоны мировой базы GBIF.</p>
      </div>
      {filtered.length > 0 && <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Каталог PlantCare · {filtered.length}</p>}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map(plant => <button key={plant.id} onClick={() => onSelect(plant)} className="overflow-hidden rounded-3xl border border-border bg-card text-left shadow-sm">
          <CatalogImage plant={plant} />
          <div className="p-3"><p className="mb-0.5 truncate text-sm font-semibold leading-tight text-foreground">{plant.name}</p>
            <p className="mb-2 truncate text-xs italic text-muted-foreground">{plant.latinName}</p><DifficultyBadge value={plant.difficulty} /></div>
        </button>)}
      </div>

      {normalized.length >= 3 && <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">GBIF · {global.total ? `${global.total.toLocaleString("ru-RU")} результатов` : "мировая база"}</p>
          {global.loading && <Loader2 size={15} className="animate-spin text-primary" />}
        </div>
        {global.error && <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">Глобальный справочник сейчас недоступен. Локальный каталог продолжает работать.</div>}
        {!global.loading && !global.error && global.results.length === 0 && <p className="rounded-2xl bg-muted p-4 text-center text-xs text-muted-foreground">В GBIF совпадений не найдено</p>}
        <div className="space-y-2">{global.results.map(plant => <button key={plant.id} onClick={() => onSelect(plant)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-xl">🌿</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{plant.name}</span><span className="block truncate text-xs italic text-muted-foreground">{plant.latinName}</span></span>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </button>)}</div>
        {global.hasMore && <button disabled={global.loading} onClick={global.loadMore} className="mt-3 w-full rounded-2xl border border-primary/25 bg-primary/5 py-3 text-sm font-semibold text-primary disabled:opacity-50">
          {global.loading ? "Загрузка…" : "Показать ещё"}
        </button>}
      </section>}
      {filtered.length === 0 && normalized.length < 3 && <p className="py-12 text-center text-sm text-muted-foreground">Ничего не найдено</p>}
    </main>
  </div>;
}
