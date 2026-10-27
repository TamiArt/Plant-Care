const MAX_PLANT_PHOTOS = 3;

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
    !deleted.has(plant.photoId) &&
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
  _serverNow: string,
): T {
  // On equal client timestamps, prefer the persisted server version. This
  // avoids letting a concurrent request with the same millisecond timestamp
  // win ordinary metadata solely because it arrived as the incoming payload.
  // Soft-delete tombstones are authoritative: a stale device with a
  // clock-skewed timestamp must not resurrect a deleted plant.
  const incomingIsDeleted = typeof incoming.deletedAt === "string";
  const remoteIsDeleted = typeof remote.deletedAt === "string";
  // If both snapshots are deleted, keep the one carrying the later deletion
  // timestamp as the metadata base. If only one is deleted, its tombstone wins
  // regardless of the active snapshot's (possibly skewed) updatedAt.
  const deletionTombstone =
    incomingIsDeleted && remoteIsDeleted
      ? Date.parse(incoming.deletedAt as string) > Date.parse(remote.deletedAt as string)
        ? incoming
        : remote
      : incomingIsDeleted
        ? incoming
        : remoteIsDeleted
          ? remote
          : null;
  const base =
    deletionTombstone ??
    (incoming.updatedAt > remote.updatedAt
      ? incoming
      : remote);

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

  return {
    ...base,
    ...mergePhotoGallery(
      incoming,
      remote,
    ),
    wateringHistory,
    mistingHistory,
    fertilizingHistory,
    // Merging an append-only care history must not make stale ordinary
    // metadata look newer than it really is. The database upsert uses this
    // timestamp to decide whether incoming metadata may replace stored data.
    // Advancing it to serverNow here could let an old nickname/location/etc.
    // overwrite a concurrent edit merely because it carried an extra history entry.
    updatedAt: deletionTombstone
      ? new Date(Math.max(
          Date.parse(incoming.updatedAt),
          Date.parse(remote.updatedAt),
          Date.parse(deletionTombstone.deletedAt as string),
        )).toISOString()
      : base.updatedAt,
  };
}


/**
 * Returns true when the persisted record contains every append-only care
 * event from the incoming snapshot. Used to detect a concurrent write that
 * caused the SQL last-write-wins guard to reject this request's snapshot.
 */
export function hasAllCareHistory(
  persisted: CareHistoryPlant,
  incoming: CareHistoryPlant,
): boolean {
  const containsAll = (stored: string[], received: string[]) =>
    received.every(value => stored.includes(value));

  return (
    containsAll(persisted.wateringHistory, incoming.wateringHistory) &&
    containsAll(persisted.mistingHistory, incoming.mistingHistory) &&
    containsAll(persisted.fertilizingHistory, incoming.fertilizingHistory)
  );
}

/**
 * Returns true when persisted gallery metadata contains every deletion
 * tombstone from the candidate snapshot. A concurrent UPSERT can otherwise
 * replace the JSON array and silently drop a photo deletion.
 */
export function hasAllPhotoTombstones(
  persisted: CareHistoryPlant,
  candidate: CareHistoryPlant,
): boolean {
  const stored = new Set(
    Array.isArray(persisted.deletedPhotoIds)
      ? persisted.deletedPhotoIds
      : [],
  );

  return (
    Array.isArray(candidate.deletedPhotoIds)
      ? candidate.deletedPhotoIds.every(id => stored.has(id))
      : true
  );
}

