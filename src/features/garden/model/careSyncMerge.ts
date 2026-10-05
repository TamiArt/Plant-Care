import type {
  UserPlant,
} from "../types";
import { MAX_PLANT_PHOTOS } from "./photoGallery";

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
 * The newer plant version has priority. The older side may contribute a
 * photo only while the three-photo capacity is still available.
 * This prevents an old snapshot from replacing the newer gallery or making
 * the plant exceed its three-photo contract.
 */
function mergePhotoGallery(
  local: UserPlant,
  remote: UserPlant,
): Pick<UserPlant, "photoId" | "photoIds" | "deletedPhotoIds"> {
  const deletedPhotoIds = [
    ...new Set([
      ...(local.deletedPhotoIds ?? []),
      ...(remote.deletedPhotoIds ?? []),
    ]),
  ];

  const localIds = normalizedPhotoIds(local);
  const remoteIds = normalizedPhotoIds(remote);
  const base =
    local.updatedAt >= remote.updatedAt
      ? localIds
      : remoteIds;
  const secondary =
    local.updatedAt >= remote.updatedAt
      ? remoteIds
      : localIds;

  const mergedIds = [
    ...base,
    ...secondary.filter(id => !base.includes(id)),
  ]
    .filter(id => !deletedPhotoIds.includes(id))
    .slice(0, MAX_PLANT_PHOTOS);

  const basePrimary =
    local.updatedAt >= remote.updatedAt
      ? local.photoId
      : remote.photoId;

  const otherPrimary =
    local.updatedAt >= remote.updatedAt
      ? remote.photoId
      : local.photoId;

  const primaryPhotoId =
    basePrimary &&
    mergedIds.includes(basePrimary)
      ? basePrimary
      : otherPrimary &&
          mergedIds.includes(otherPrimary)
        ? otherPrimary
        : mergedIds[0] ?? null;

  return {
    photoIds: mergedIds,
    deletedPhotoIds,
    photoId: primaryPhotoId,
  };
}

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
