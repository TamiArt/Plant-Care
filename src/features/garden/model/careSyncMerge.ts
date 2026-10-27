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
    !deleted.has(plant.photoId) &&
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
  // A soft-delete tombstone is authoritative. A stale device may have
  // a skewed/future updatedAt; it must not resurrect a deleted plant.
  const deletionTombstone =
    local.deletedAt !== null
      ? local
      : remote.deletedAt !== null
        ? remote
        : null;
  const base =
    deletionTombstone ??
    (local.updatedAt > remote.updatedAt
      ? local
      : remote);

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

  const mergedPhotoGallery = mergePhotoGallery(local, remote);
  const basePhotoIds = normalizedPhotoIds(base);
  const galleryChanged =
    mergedPhotoGallery.photoIds.length !== basePhotoIds.length ||
    mergedPhotoGallery.photoIds.some((id, index) => id !== basePhotoIds[index]) ||
    mergedPhotoGallery.photoId !== base.photoId ||
    mergedPhotoGallery.deletedPhotoIds.length !== (base.deletedPhotoIds ?? []).length ||
    mergedPhotoGallery.deletedPhotoIds.some((id, index) => id !== (base.deletedPhotoIds ?? [])[index]);

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
    ...mergedPhotoGallery,
    wateringHistory,
    mistingHistory,
    fertilizingHistory,
    // Merging append-only history/gallery is not a user edit. Do not
    // manufacture a newer timestamp that could promote stale metadata.
    updatedAt: deletionTombstone
      ? (deletionTombstone.deletedAt && deletionTombstone.deletedAt > base.updatedAt
          ? deletionTombstone.deletedAt
          : base.updatedAt)
      : base.updatedAt,
  };
}
