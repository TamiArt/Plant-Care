import type { WateringStatus } from "../model/watering";

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

export function WateringIndicator({ status, interval }: { status: WateringStatus; interval: number }) {
  const maximumDrops = 10;
  const total = Math.min(interval, maximumDrops);
  const overdue = status.daysUntil < 0;
  const dueToday = status.daysUntil === 0 && status.color !== "gray";
  const neverWatered = status.color === "gray";
  const filled = overdue
    ? 0
    : interval <= maximumDrops
      ? Math.max(0, status.daysUntil)
      : Math.round((Math.max(0, status.daysUntil) / interval) * maximumDrops);
  const labelColor = overdue || dueToday
    ? "text-red-500"
    : status.color === "yellow" ? "text-amber-600" : "text-muted-foreground";

  let label: string;
  if (neverWatered) label = "Полейте сегодня";
  else if (dueToday || overdue) label = overdue ? `Просрочено на ${Math.abs(status.daysUntil)} дн.` : "Полить сегодня";
  else if (status.daysUntil === 1) label = "Полить завтра";
  else label = `До полива ${status.daysUntil} дн.`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5 flex-wrap">
        {Array.from({ length: total }).map((_, index) => <WaterDrop key={index} filled={index < filled} overdue={overdue} />)}
      </div>
      <p className={`text-[11px] font-medium leading-none ${labelColor}`}>{label}</p>
    </div>
  );
}
