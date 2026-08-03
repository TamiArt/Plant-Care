import { getSeasonLabel, getSeasonTips, isWinterMonth } from "../model/season";

export function ChecklistScreen() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const tips = getSeasonTips(month);
  const season = getSeasonLabel(month);
  const monthName = now.toLocaleDateString("ru-RU", { month: "long" });
  const winter = isWinterMonth(month);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Чек-лист</h1>
        <p className="text-xs text-muted-foreground">{season} · {monthName.charAt(0).toUpperCase() + monthName.slice(1)}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-3">
        <div className="bg-primary/8 border border-primary/20 rounded-3xl p-4">
          <p className="text-sm font-semibold text-primary mb-1">
            {winter ? "❄️ Зимний режим активен" : "🌿 Активный сезон роста"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {winter
              ? "Интервалы полива автоматически увеличены. Большинство растений в покое."
              : "Поливайте чаще, подкармливайте и пересаживайте разросшиеся растения."}
          </p>
        </div>
        {tips.map(tip => (
          <div key={tip.id} className="bg-card border border-border rounded-3xl p-4 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{tip.icon}</span>
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">{tip.category}</p>
              <p className="text-sm text-foreground leading-relaxed">{tip.tip}</p>
            </div>
          </div>
        ))}
        {tips.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">✨</div>
            <p className="text-sm text-muted-foreground">Следите за регулярным поливом!</p>
          </div>
        )}
      </div>
    </div>
  );
}
