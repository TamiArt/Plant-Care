import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ChevronRight, Plus, Search } from "lucide-react";
import { PlantImage } from "../../../shared/components/PlantImage";
import { CATALOG } from "../catalog";
import { filterCatalog } from "../search";
import type { CatalogPlant } from "../types";
import { CATALOG_FILTERS } from "../CatalogScreen";
import { DifficultyBadge } from "./DifficultyBadge";

export function AddScreen({ onSelectCatalog, onAddCustom }: {
  onSelectCatalog: (cp: CatalogPlant, photo: string | null) => void;
  onAddCustom: (photo: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [addFilter, setAddFilter] = useState<string | null>(null);
  const filteredCatalog = filterCatalog(CATALOG, catalogQuery, addFilter);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Добавить</h1>
        <p className="text-xs text-muted-foreground">Добавьте фото или выберите растение из каталога</p>
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

        {photo && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">Фото добавлено</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Автоматическое распознавание не используется: бесплатной достаточно точной модели пока нет. Найдите растение в каталоге ниже или добавьте свою карточку.</p>
          </div>
        )}

        {/* Custom plant button */}
        <button
          onClick={() => onAddCustom(photo)}
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
              <button key={cp.id} onClick={() => onSelectCatalog(cp, photo)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3 text-left active:bg-secondary transition-colors"
              >
                <PlantImage catalogPlant={cp} className="w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{cp.name}</p>
                  <p className="text-xs text-muted-foreground italic truncate mb-1">{cp.latinName}</p>
                  <DifficultyBadge value={cp.difficulty} />
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
