import { Smartphone, WifiOff } from "lucide-react";

export interface PwaStatusProps {
  canInstall: boolean;
  isOnline: boolean;
  offlineReady?: boolean;
  updateAvailable?: boolean;
  storageError?: string | null;
  onInstall: () => void | Promise<void>;
  onUpdate?: () => void;
}

export function PwaStatus({ canInstall, isOnline, offlineReady, updateAvailable, storageError, onInstall, onUpdate }: PwaStatusProps) {
  return (
    <div aria-live="polite" className="absolute top-3 inset-x-3 z-50 flex flex-col gap-2 pointer-events-none">
      {!isOnline && (
        <div className="self-center flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-xs font-medium shadow-lg">
          <WifiOff size={14} /> Офлайн-режим: ваши данные доступны
        </div>
      )}
      {storageError && <div role="alert" className="self-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-lg">Не удалось сохранить данные. Скачайте резервную копию.</div>}
      {offlineReady && !updateAvailable && <div className="self-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg">Приложение готово к работе без сети</div>}
      {updateAvailable && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl">
          <p className="min-w-0 flex-1 text-xs font-medium text-foreground">Доступна новая версия PlantCare</p>
          <button type="button" onClick={onUpdate} className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">Обновить</button>
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
