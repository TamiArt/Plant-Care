import { Smartphone, WifiOff } from "lucide-react";

export interface PwaStatusProps {
  canInstall: boolean;
  isOnline: boolean;
  onInstall: () => void | Promise<void>;
}

export function PwaStatus({ canInstall, isOnline, onInstall }: PwaStatusProps) {
  return (
    <div aria-live="polite" className="absolute top-3 inset-x-3 z-50 flex flex-col gap-2 pointer-events-none">
      {!isOnline && (
        <div className="self-center flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-xs font-medium shadow-lg">
          <WifiOff size={14} /> Офлайн-режим: ваши данные доступны
        </div>
      )}
      {canInstall && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-card border border-border p-3 shadow-xl">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <Smartphone size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">Установить PlantCare</p>
            <p className="text-[10px] text-muted-foreground">Работает с главного экрана и без сети</p>
          </div>
          <button onClick={onInstall} className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">
            Установить
          </button>
        </div>
      )}
    </div>
  );
}
