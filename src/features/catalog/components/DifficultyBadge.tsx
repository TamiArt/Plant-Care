import type { CatalogPlant } from "../types";

export function DifficultyBadge({ value }: { value: CatalogPlant["difficulty"] }) {
  const styles = {
    easy: { label: "Простой", className: "bg-emerald-100 text-emerald-700" },
    medium: { label: "Средний", className: "bg-amber-100 text-amber-700" },
    hard: { label: "Дива ⚠️", className: "bg-red-100 text-red-700" },
  } as const;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[value].className}`}>{styles[value].label}</span>;
}
