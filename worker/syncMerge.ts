export interface CareHistoryPlant {
  id?: string;
  nickname?: string;
  updatedAt: string;
  wateringHistory: string[];
  mistingHistory: string[];
  fertilizingHistory: string[];
  photoId?: string | null;
  photoIds?: string[];
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
  const ids = Array.isArray(plant.photoIds)
    ? plant.photoIds.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0,
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
 * Every photo from both sides is retained; there is intentionally no
 * three-photo limit.
 *
 * photoId is the explicitly selected main photo when it is still present.
 * If neither side has a valid selection, the first photo in the merged
 * gallery remains the default main photo.
 */
function mergePhotoGallery<T extends CareHistoryPlant>(
  incoming: T,
  remote: T,
): Pick<T, "photoId" | "photoIds"> {
  const incomingIds = normalizedPhotoIds(incoming);
  const remoteIds = normalizedPhotoIds(remote);

  const mergedIds = [
    ...incomingIds,
    ...remoteIds.filter(
      id => !incomingIds.includes(id),
    ),
  ];

  const primaryPhotoId =
    incoming.photoId &&
    mergedIds.includes(incoming.photoId)
      ? incoming.photoId
      : remote.photoId &&
          mergedIds.includes(remote.photoId)
        ? remote.photoId
        : mergedIds[0] ?? null;

  return {
    photoIds: mergedIds,
    photoId: primaryPhotoId,
  } as Pick<T, "photoId" | "photoIds">;
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
