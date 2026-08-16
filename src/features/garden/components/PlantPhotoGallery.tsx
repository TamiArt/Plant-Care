import { useEffect, useState } from "react";
import { PlantImage } from "../../../shared/components/PlantImage";
import { getPlantPhotoIds } from "../model/photos";
import { getPlantPhoto } from "../repository/gardenRepository";
import type { UserPlant } from "../types";

function GalleryPhoto({ photoId }: { photoId: string }) {
  const [createdAt, setCreatedAt] = useState("");

  useEffect(() => {
    let active = true;
    void getPlantPhoto(photoId).then(photo => {
      if (active) setCreatedAt(photo?.createdAt ?? "");
    });
    return () => { active = false; };
  }, [photoId]);

  return <div className="min-w-0">
    <PlantImage photoId={photoId} className="h-20 w-full rounded-xl" />
    <p className="mt-1 text-center text-[10px] text-muted-foreground">
      {createdAt ? new Date(createdAt).toLocaleDateString("ru-RU") : ""}
    </p>
  </div>;
}

export function PlantPhotoGallery({ plant }: { plant: UserPlant }) {
  const photoIds = getPlantPhotoIds(plant);
  if (photoIds.length < 2) return null;

  return <div className="grid grid-cols-3 gap-2 px-5 pt-3">
    {photoIds.map(photoId => <GalleryPhoto key={photoId} photoId={photoId} />)}
  </div>;
}
