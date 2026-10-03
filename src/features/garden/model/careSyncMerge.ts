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

function normalizedPhotoIds(
  plant: UserPlant,
): string[] {
  const deleted = new Set(plant.deletedPhotoIds ?? []);
  const ids = Array.isArray(plant.photoIds)
    ? plant.photoIds.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && !deleted.has(id),
      )
    : [];

  if (
    plant.photoId &&
    !ids.includes(plant.photoId)
  ) {
    ids.unshift(plant.photoId);
  }

  return [...new Set(ids)];
}

/**
 * Gallery metadata is merged independently from ordinary LWW fields.
 * Local photoIds have priority because the local photo Blob is the source
 * of truth for the current device until the cloud upload completes.
 * The merged gallery contains the complete photo history.
 */
function mergePhotoGallery(
  local: UserPlant,
  remote: UserPlant,
): Pick<UserPlant, "photoId" | "photoIds" | "deletedPhotoIds"> {
  const deletedPhotoIds = [...new Set([...(local.deletedPhotoIds ?? []), ...(remote.deletedPhotoIds ?? [])])];
  const localIds = normalizedPhotoIds(local);
  const remoteIds = normalizedPhotoIds(remote);
  const mergedIds = [
    ...localIds,
    ...remoteIds.filter(
      id => !localIds.includes(id),
    ),
  ];

  const primaryPhotoId =
    local.photoId &&
    mergedIds.includes(local.photoId)
      ? local.photoId
      : remote.photoId &&
          mergedIds.includes(remote.photoId)
        ? remote.photoId
        : mergedIds[0] ?? null;

  return {
    photoIds: mergedIds,
    deletedPhotoIds,
    photoId: primaryPhotoId,
  };}

/**
 * Обычные поля выбираются по LWW.
 * Истории ухода объединяются, потому что уже
 * совершённый полив/опрыскивание/удобрение
 * нельзя потерять из-за устаревшего sync-ответа.
 *
 * Галерея объединяется отдельно, чтобы ответ sync не мог
 * затереть локально добавленные фотографии.
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
    ...mergePhotoGallery(
      local,
      remote,
    ),
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
