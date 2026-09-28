export interface CareHistoryPlant {
  updatedAt: string;
  wateringHistory: string[];
  mistingHistory: string[];
  fertilizingHistory: string[];
  photoId?: string | null;
  photoIds?: string[];
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

  if (ids.length === 0 && typeof plant.photoId === "string" && plant.photoId) {
    ids.push(plant.photoId);
  }

  return [...new Set(ids)];
}

/**
 * Gallery metadata is merged independently from ordinary LWW fields.
 * The incoming snapshot is the local snapshot sent by the device, so its
 * photoIds have priority. Remote-only photos are retained so both devices keep the complete gallery.
 * The final gallery is always limited to three photos.
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
        : mergedIds.at(-1) ?? null;

  return {
    photoIds: mergedIds,
    photoId: primaryPhotoId,
  } as Pick<T, "photoId" | "photoIds">;}
