import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  RefreshCw,
  WifiOff,
} from "lucide-react";

import type {
  GardenSyncStatus,
} from "../../garden/hooks/useGarden";

export interface SyncStatusCardProps {
  authenticated: boolean;

  status: GardenSyncStatus;

  error: string | null;

  lastSyncedAt:
    | string
    | null;

  onSync: () => void;
}

function formatSyncTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export function SyncStatusCard({
  authenticated,
  status,
  error,
  lastSyncedAt,
  onSync,
}: SyncStatusCardProps) {
  if (!authenticated) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-2xl bg-secondary p-4">
        <Cloud
          size={18}
          className="mt-0.5 shrink-0 text-primary"
        />

        <div>
          <p className="mb-0.5 text-sm font-medium text-foreground">
            Синхронизация
          </p>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Войдите в аккаунт,
            чтобы синхронизировать
            растения между
            устройствами.
          </p>
        </div>
      </div>
    );
  }

  const isSyncing =
    status === "syncing";

  return (
    <div className="mb-4 rounded-2xl bg-secondary p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-primary">
          {status ===
          "syncing" ? (
            <RefreshCw
              size={18}
              className="animate-spin"
            />
          ) : status ===
            "synced" ? (
            <CheckCircle2
              size={18}
            />
          ) : status ===
            "offline" ? (
            <WifiOff
              size={18}
            />
          ) : status ===
            "error" ? (
            <AlertTriangle
              size={18}
            />
          ) : (
            <Cloud
              size={18}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-sm font-medium text-foreground">
            Синхронизация
          </p>

          {status ===
            "syncing" && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Синхронизируем
              растения…
            </p>
          )}

          {status ===
            "synced" && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Растения
              синхронизированы
              между устройствами.
              {lastSyncedAt
                ? ` Последняя: ${formatSyncTime(
                    lastSyncedAt,
                  )}.`
                : ""}
            </p>
          )}

          {status ===
            "offline" && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Нет интернета.
              Изменения остаются
              сохранёнными на этом
              устройстве и будут
              отправлены позже.
            </p>
          )}

          {status ===
            "error" && (
            <p className="text-xs leading-relaxed text-red-700">
              {error ||
                "Не удалось выполнить синхронизацию."}
            </p>
          )}

          {status ===
            "idle" && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Аккаунт подключён.
              Данные растений готовы
              к синхронизации.
            </p>
          )}

          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Фотографии пока
            хранятся только на
            этом устройстве.
            Облачное хранение фото
            подключим следующим
            этапом.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isSyncing}
        onClick={onSync}
        className="
          mt-3
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-xl
          border
          border-border
          bg-card
          py-2.5
          text-xs
          font-medium
          text-foreground
          disabled:opacity-50
        "
      >
        <RefreshCw
          size={14}
          className={
            isSyncing
              ? "animate-spin"
              : ""
          }
        />

        {isSyncing
          ? "Синхронизация…"
          : "Синхронизировать сейчас"}
      </button>
    </div>
  );
}