import type {
  SupplementalLightSchedule,
  UserPlant,
} from "../types";

const TIME_PATTERN =
  /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isMistingEnabled(
  plant: Pick<UserPlant, "mistingEnabled">,
): boolean {
  return plant.mistingEnabled !== false;
}

export function isValidTime(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    TIME_PATTERN.test(value)
  );
}

export function normalizeSupplementalLight(
  value: unknown,
): SupplementalLightSchedule | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const schedule =
    value as Record<string, unknown>;

  if (
    !isValidTime(schedule.start) ||
    !isValidTime(schedule.end) ||
    schedule.start === schedule.end
  ) {
    return null;
  }

  return {
    start: schedule.start,
    end: schedule.end,
  };
}

export function formatSupplementalLight(
  schedule: SupplementalLightSchedule,
): string {
  return `${schedule.start}–${schedule.end}`;
}
