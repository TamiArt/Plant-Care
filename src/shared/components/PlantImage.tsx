import { useState } from "react";

export interface PlantImageSource {
  name: string;
  emoji: string;
  unsplashId: string;
}

export interface PlantImageProps {
  catalogPlant?: PlantImageSource | null;
  userPhoto?: string | null;
  emoji?: string;
  className?: string;
}

export function PlantImage({ catalogPlant, userPhoto, emoji, className = "" }: PlantImageProps) {
  const [failed, setFailed] = useState(false);
  const fallbackEmoji = emoji || catalogPlant?.emoji || "🌿";
  if (userPhoto && !failed) {
    return <img src={userPhoto} alt="" className={`object-cover bg-secondary ${className}`} onError={() => setFailed(true)} />;
  }
  if (catalogPlant?.unsplashId && !failed) {
    const src = `https://images.unsplash.com/${catalogPlant.unsplashId}?w=400&h=400&fit=crop&auto=format`;
    return <img src={src} alt={catalogPlant.name} className={`object-cover bg-secondary ${className}`} onError={() => setFailed(true)} />;
  }
  return <div className={`flex items-center justify-center bg-secondary text-4xl ${className}`}>{fallbackEmoji}</div>;
}
