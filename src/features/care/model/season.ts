export interface SeasonTip {
  id: string;
  category: string;
  icon: string;
  tip: string;
  months: number[];
}

export const SEASON_TIPS: SeasonTip[] = [
  { id: "t1", category: "Пересадка", icon: "🪴", tip: "Идеальное время для пересадки растений, которые переросли горшок. Выбирайте новый горшок на 2–3 см больше.", months: [3, 4] },
  { id: "t2", category: "Удобрения", icon: "🌿", tip: "Начните подкормку азотными удобрениями для активного роста. Раз в 2 недели до сентября.", months: [4, 5, 6] },
  { id: "t3", category: "Размножение", icon: "✂️", tip: "Лучшее время для черенкования — длинный световой день ускоряет укоренение.", months: [5, 6] },
  { id: "t4", category: "Полив", icon: "💧", tip: "Увеличьте частоту полива: в жару растения испаряют влагу быстрее. Проверяйте грунт каждые 2–3 дня.", months: [6, 7, 8] },
  { id: "t5", category: "Вредители", icon: "🔍", tip: "Пик паутинного клеща в жаркое и сухое время. Осматривайте нижнюю сторону листьев еженедельно.", months: [7, 8] },
  { id: "t6", category: "Опрыскивание", icon: "💨", tip: "Опрыскивайте тропические растения ежедневно — кондиционеры сильно сушат воздух летом.", months: [6, 7, 8] },
  { id: "t7", category: "Подготовка", icon: "🍂", tip: "Переместите растения с балконов и холодных подоконников. Начните сокращать подкормки.", months: [9, 10] },
  { id: "t8", category: "Удобрения", icon: "🚫", tip: "Прекратите подкормку полностью. Азот стимулирует рост, который не успеет вызреть до зимы.", months: [10, 11] },
  { id: "t9", category: "Полив", icon: "💧", tip: "Сократите полив вдвое. Большинство растений в период покоя потребляет намного меньше воды.", months: [11, 12, 1, 2] },
  { id: "t10", category: "Свет", icon: "☀️", tip: "Переместите светолюбивые растения ближе к окну или установите фитолампу — световой день короткий.", months: [11, 12, 1] },
  { id: "t11", category: "Влажность", icon: "🌡️", tip: "Отопление сушит воздух. Ставьте поддоны с влажным керамзитом под горшки тропических растений.", months: [12, 1, 2] },
  { id: "t12", category: "Пробуждение", icon: "🌱", tip: "Растения начинают оживать. Постепенно увеличивайте полив и подготовьте грунт для пересадки.", months: [2, 3] },
];

export function isWinterMonth(month: number): boolean {
  return month === 11 || month === 12 || month === 1 || month === 2 || month === 3;
}

export function getSeasonLabel(month: number): string {
  if (month >= 3 && month <= 5) return "Весна 🌸";
  if (month >= 6 && month <= 8) return "Лето ☀️";
  if (month >= 9 && month <= 11) return "Осень 🍂";
  return "Зима ❄️";
}

export function getSeasonTips(month: number): SeasonTip[] {
  return SEASON_TIPS.filter(tip => tip.months.includes(month));
}
