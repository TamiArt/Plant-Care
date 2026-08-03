import type { UserPlant } from "../types";

const DAY_MS = 86_400_000;

export interface WateringStatus {
  label: string;
  color: "green" | "yellow" | "red" | "gray";
  daysUntil: number;
  urgency: number;
}

export function daysSince(dateStr: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(dateStr).getTime()) / DAY_MS);
}

export function getWateringStatus(plant: UserPlant, now: number = Date.now()): WateringStatus {
  if (plant.wateringHistory.length === 0) {
    return { label: "Полейте сегодня", color: "gray", daysUntil: 0, urgency: 0.5 };
  }

  const lastWatering = plant.wateringHistory[plant.wateringHistory.length - 1];
  const daysUntil = plant.wateringInterval - daysSince(lastWatering, now);
  if (daysUntil <= 0) {
    return {
      label: daysUntil === 0 ? "Полейте сегодня" : `Просрочено ${Math.abs(daysUntil)} дн.`,
      color: "red",
      daysUntil,
      urgency: 1,
    };
  }
  if (daysUntil === 1) {
    return { label: "Полейте завтра", color: "yellow", daysUntil, urgency: 0.7 };
  }
  return { label: `Через ${daysUntil} дн.`, color: "green", daysUntil, urgency: 0 };
}

export function replaceLastWateringDate(history: string[], date: string | null): string[] {
  const previous = history.slice(0, -1);
  return date ? [...previous, date] : previous;
}
