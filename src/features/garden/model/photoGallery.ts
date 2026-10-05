export const MAX_PLANT_PHOTOS = 3;

export interface PhotoGallerySlot<TPhoto> {
  photoId?: string;
  photo?: TPhoto;
}

export interface PhotoGalleryResult<TPhoto> {
  photoIds: string[];
  primaryPhotoId: string | null;
  newPhotos: Array<{ id: string; photo: TPhoto }>;
  removedPhotoIds: string[];
}

/**
 * Builds the complete desired gallery from the editor state.
 *
 * A plant may have at most three photos. Existing photos are retained
 * unless the editor explicitly removes them; adding a photo never
 * replaces an existing photo implicitly.
 */
export function buildPhotoGallery<TPhoto>(
  currentPhotoIds: string[],
  currentPrimaryPhotoId: string | null,
  slots: Array<PhotoGallerySlot<TPhoto>>,
  primaryPhotoIndex: number | null,
  createPhotoId: () => string,
): PhotoGalleryResult<TPhoto> {
  const currentIds = [
    ...new Set(
      currentPhotoIds.filter(
        id =>
          typeof id === "string" &&
          id.length > 0,
      ),
    ),
  ].slice(0, MAX_PLANT_PHOTOS);

  const currentIdSet = new Set(currentIds);
  const retainedIds = new Set<string>();
  const nextIds: string[] = [];
  const newPhotos: Array<{
    id: string;
    photo: TPhoto;
  }> = [];

  for (const slot of slots) {
    if (nextIds.length >= MAX_PLANT_PHOTOS) {
      break;
    }

    if (
      slot.photoId &&
      currentIdSet.has(slot.photoId)
    ) {
      if (!retainedIds.has(slot.photoId)) {
        nextIds.push(slot.photoId);
        retainedIds.add(slot.photoId);
      }
      continue;
    }

    if (slot.photo) {
      const id = createPhotoId();
      nextIds.push(id);
      retainedIds.add(id);
      newPhotos.push({
        id,
        photo: slot.photo,
      });
    }
  }

  const removedPhotoIds = currentIds.filter(
    id => !retainedIds.has(id),
  );

  const normalizedIds = [
    ...new Set(nextIds),
  ].slice(0, MAX_PLANT_PHOTOS);

  const selectedByIndex =
    primaryPhotoIndex !== null &&
    primaryPhotoIndex >= 0 &&
    primaryPhotoIndex < normalizedIds.length
      ? normalizedIds[primaryPhotoIndex]
      : null;

  const existingPrimary =
    currentPrimaryPhotoId &&
    normalizedIds.includes(
      currentPrimaryPhotoId,
    )
      ? currentPrimaryPhotoId
      : null;

  return {
    photoIds: normalizedIds,
    primaryPhotoId:
      selectedByIndex ??
      existingPrimary ??
      normalizedIds[0] ??
      null,
    newPhotos: newPhotos.filter(
      item => normalizedIds.includes(item.id),
    ),
    removedPhotoIds,
  };
}
