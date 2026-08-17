export interface CareHistoryPlant {
  updatedAt: string;
  wateringHistory: string[];
  mistingHistory: string[];
  fertilizingHistory: string[];
}

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

function latestTimestamp(
  first: string,
  second: string,
): string {
  return first >= second
    ? first
    : second;
}

/**
 * Обычные поля остаются LWW.
 * Истории ухода — append-only события:
 * событие нельзя потерять из-за более
 * нового snapshot другого устройства.
 */
export function mergeCareHistoryPlant<
  T extends CareHistoryPlant,
>(
  remote: T,
  incoming: T,
  serverNow: string,
): T {
  const base =
    incoming.updatedAt > remote.updatedAt
      ? incoming
      : remote;

  const wateringHistory =
    mergeHistory(
      remote.wateringHistory,
      incoming.wateringHistory,
    );

  const mistingHistory =
    mergeHistory(
      remote.mistingHistory,
      incoming.mistingHistory,
    );

  const fertilizingHistory =
    mergeHistory(
      remote.fertilizingHistory,
      incoming.fertilizingHistory,
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
      ? latestTimestamp(
          base.updatedAt,
          serverNow,
        )
      : base.updatedAt,
  };
}
