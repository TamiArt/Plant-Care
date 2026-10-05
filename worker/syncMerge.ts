import { MAX_PLANT_PHOTOS } from "../src/features/garden/model/photoGallery";

export interface CareHistoryPlant {
  id?: string;
  nickname?: string;
  updatedAt: string;
  wateringHistory: string[];
  mistingHistory: string[];
  fertilizingHistory: string[];
  photoId?: string | null;
  photoIds?: string[];
  deletedPhotoIds?: string[];
  [key: string]: unknown;
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

function normalizedPhotoIds(
  plant: CareHistoryPlant,
): string[] {
  const deleted = new Set(
    Array.isArray(plant.deletedPhotoIds)
      ? plant.deletedPhotoIds.filter(id => typeof id === "string" && id.length > 0)
      : [],
  );
  const ids = Array.isArray(plant.photoIds)
    ? plant.photoIds.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && !deleted.has(id),
      )
    : [];

  if (
    typeof plant.photoId === "string" &&
    plant.photoId &&
    !ids.includes(plant.photoId)
  ) {
    ids.unshift(plant.photoId);
  }

  return [...new Set(ids)];
}

/**
 * Photo gallery is merged independently from ordinary LWW fields.
 *
 * The incoming snapshot is the local snapshot sent by the device.
 * The newer plant version has priority. The older side may contribute
 * photos only while the three-photo capacity remains available.
 * photoId follows the newer version whenever its selected photo is valid.
 */
function mergePhotoGallery<T extends CareHistoryPlant>(
  incoming: T,
  remote: T,
): Pick<T, "photoId" | "photoIds" | "deletedPhotoIds"> {
  const deletedPhotoIds = [
    ...new Set([
      ...(Array.isArray(remote.deletedPhotoIds) ? remote.deletedPhotoIds : []),
      ...(Array.isArray(incoming.deletedPhotoIds) ? incoming.deletedPhotoIds : []),
    ]),
  ].filter(id => typeof id === "string" && id.length > 0));

  const incomingIds = normalizedPhotoIds(incoming);
  const remoteIds = normalizedPhotoIds(remote);
  const base =
    incoming.updatedAt >= remote.updatedAt
      ? incomingIds
      : remoteIds;
  const secondary =
    incoming.updatedAt >= remote.updatedAt
      ? remoteIds
      : incomingIds;

  const mergedIds = [
    ...base,
    ...secondary.filter(id => !base.includes(id)),
  ]
    .filter(id => !deletedPhotoIds.includes(id))
    .slice(0, MAX_PLANT_PHOTOS);

  const basePrimary =
    incoming.updatedAt >= remote.updatedAt
      ? incoming.photoId
      : remote.photoId;
  const otherPrimary =
    incoming.updatedAt >= remote.updatedAt
      ? remote.photoId
      : incoming.photoId;

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
  } as Pick<T, "photoId" | "photoIds" | "deletedPhotoIds">;
}

/**
 * Merges care history while preserving ordinary metadata according to
 * last-write-wins. Photo galleries are always unioned separately.
 */
export function mergeCareHistoryPlant<T extends CareHistoryPlant>(
  remote: T,
  incoming: T,
  serverNow: string,
): T {
  const base =
    incoming.updatedAt >= remote.updatedAt
      ? incoming
      : remote;

  const wateringHistory = mergeHistory(
    remote.wateringHistory,
    incoming.wateringHistory,
  );
  const mistingHistory = mergeHistory(
    remote.mistingHistory,
    incoming.mistingHistory,
  );
  const fertilizingHistory = mergeHistory(
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
    ...mergePhotoGallery(
      incoming,
      remote,
    ),
    wateringHistory,
    mistingHistory,
    fertilizingHistory,
    updatedAt: historyChanged
      ? latestTimestamp(serverNow, base.updatedAt)
      : base.updatedAt,
  };
}
