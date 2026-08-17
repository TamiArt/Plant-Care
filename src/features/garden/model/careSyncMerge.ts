import type {
  UserPlant,
} from "../types";

function mergeHistory(
  first: string[],
  second: string[],
): string[] {
  return [
    ...new Set([
      ...first,
      ...second,
    ]),
  ].sort();
}

function sameHistory(
  first: string[],
  second: string[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (value, index) =>
        value === second[index],
    )
  );
}

function mergedTimestamp(
  first: string,
  second: string,
): string {
  const latest = Math.max(
    Date.now(),
    Date.parse(first),
    Date.parse(second),
  );

  return new Date(
    latest + 1,
  ).toISOString();
}

/**
 * Обычные поля выбираются по LWW.
 * Истории ухода объединяются, потому что уже
 * совершённый полив/опрыскивание/удобрение
 * нельзя потерять из-за устаревшего sync-ответа.
 */
export function mergeSyncedPlant(
  local: UserPlant,
  remote: UserPlant,
): UserPlant {
  const base =
    local.updatedAt > remote.updatedAt
      ? local
      : remote;

  const wateringHistory =
    mergeHistory(
      local.wateringHistory,
      remote.wateringHistory,
    );

  const mistingHistory =
    mergeHistory(
      local.mistingHistory,
      remote.mistingHistory,
    );

  const fertilizingHistory =
    mergeHistory(
      local.fertilizingHistory,
      remote.fertilizingHistory,
    );

  const historyChanged =
    !sameHistory(
      base.wateringHistory,
      wateringHistory,
    ) ||
    !sameHistory(
      base.mistingHistory,
      mistingHistory,
    ) ||
    !sameHistory(
      base.fertilizingHistory,
      fertilizingHistory,
    );

  return {
    ...base,
    wateringHistory,
    mistingHistory,
    fertilizingHistory,
    updatedAt: historyChanged
      ? mergedTimestamp(
          local.updatedAt,
          remote.updatedAt,
        )
      : base.updatedAt,
  };
}
