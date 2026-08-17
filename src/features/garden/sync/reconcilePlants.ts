import type {
  UserPlant,
} from "../types";

function mergeHistory(
  ...histories: string[][]
): string[] {
  return [
    ...new Set(
      histories.flat(),
    ),
  ].sort();
}

function sameArray(
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

function nextTimestamp(
  ...values: Array<string | undefined>
): string {
  const maxTimestamp =
    Math.max(
      Date.now(),
      ...values.map(value => {
        const parsed = value
          ? Date.parse(value)
          : Number.NaN;

        return Number.isFinite(parsed)
          ? parsed
          : 0;
      }),
    );

  return new Date(
    maxTimestamp + 1,
  ).toISOString();
}

function changedSinceSnapshot(
  latest: UserPlant,
  sent?: UserPlant,
): boolean {
  if (!sent) {
    return true;
  }

  return (
    latest.updatedAt !== sent.updatedAt ||
    latest.deletedAt !== sent.deletedAt
  );
}

/**
 * Защищает локальные изменения от устаревшего
 * ответа синхронизации.
 *
 * Важный сценарий:
 * 1. sync отправил snapshot A;
 * 2. пользователь полил растение -> snapshot B;
 * 3. сервер вернул ответ для A;
 * 4. B нельзя перезаписывать ответом для A.
 *
 * Истории ухода дополнительно объединяются,
 * потому что это append-only события.
 */
export function reconcilePlantSync(
  sentPlants: UserPlant[],
  latestLocalPlants: UserPlant[],
  remotePlants: UserPlant[],
): UserPlant[] {
  const sentById =
    new Map(
      sentPlants.map(
        plant => [plant.id, plant],
      ),
    );

  const latestById =
    new Map(
      latestLocalPlants.map(
        plant => [plant.id, plant],
      ),
    );

  const remoteById =
    new Map(
      remotePlants.map(
        plant => [plant.id, plant],
      ),
    );

  const ids =
    new Set([
      ...sentById.keys(),
      ...latestById.keys(),
      ...remoteById.keys(),
    ]);

  const result: UserPlant[] = [];

  for (const id of ids) {
    const sent =
      sentById.get(id);
    const latest =
      latestById.get(id);
    const remote =
      remoteById.get(id);

    if (!latest && remote) {
      result.push(remote);
      continue;
    }

    if (latest && !remote) {
      result.push(latest);
      continue;
    }

    if (!latest || !remote) {
      continue;
    }

    const localChanged =
      changedSinceSnapshot(
        latest,
        sent,
      );

    const base = localChanged
      ? latest
      : remote.updatedAt >= latest.updatedAt
        ? remote
        : latest;

    const wateringHistory =
      mergeHistory(
        remote.wateringHistory,
        sent?.wateringHistory ?? [],
        latest.wateringHistory,
      );

    const mistingHistory =
      mergeHistory(
        remote.mistingHistory,
        sent?.mistingHistory ?? [],
        latest.mistingHistory,
      );

    const fertilizingHistory =
      mergeHistory(
        remote.fertilizingHistory,
        sent?.fertilizingHistory ?? [],
        latest.fertilizingHistory,
      );

    const careHistoryChanged =
      !sameArray(
        base.wateringHistory,
        wateringHistory,
      ) ||
      !sameArray(
        base.mistingHistory,
        mistingHistory,
      ) ||
      !sameArray(
        base.fertilizingHistory,
        fertilizingHistory,
      );

    const mustOutrankRemote =
      localChanged &&
      remote.updatedAt >= latest.updatedAt;

    result.push({
      ...base,
      wateringHistory,
      mistingHistory,
      fertilizingHistory,
      updatedAt:
        careHistoryChanged ||
        mustOutrankRemote
          ? nextTimestamp(
              remote.updatedAt,
              latest.updatedAt,
              sent?.updatedAt,
            )
          : base.updatedAt,
    });
  }

  return result;
}
