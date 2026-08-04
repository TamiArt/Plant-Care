import { LANG_LABELS, useGbif } from "../gbif";

export function GbifPanel({ latinName }: { latinName: string }) {
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
