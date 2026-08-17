import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getMetaValue,
  setMetaValue,
} from "../repository/gardenRepository";

export interface AutoSyncResult {
  ok: boolean;
  error?: string;
  syncedAt?: string;
}

export interface UseGardenAutoSyncOptions {
  userId: string | null;
  authLoading: boolean;
  gardenLoading: boolean;
  syncWithCloud:
    () => Promise<AutoSyncResult>;
}

const DAILY_SYNC_INTERVAL_MS =
  24 * 60 * 60 * 1000;

function lastSyncMetaKey(
  userId: string,
): string {
  return `garden:lastSyncedAt:${userId}`;
}

function isValidTimestamp(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value))
  );
}

function isDailySyncDue(
  lastSyncedAt: string | null,
): boolean {
  if (!lastSyncedAt) {
    return true;
  }

  const timestamp =
    Date.parse(lastSyncedAt);

  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return (
    Date.now() - timestamp >=
    DAILY_SYNC_INTERVAL_MS
  );
}

/**
 * Планировщик облачной синхронизации.
 *
 * Автоматически синхронизирует сад не чаще
 * одного раза в 24 часа. Ручной sync доступен
 * всегда через syncNow(). Локальные изменения
 * сами по себе сетевой запрос не запускают.
 */
export function useGardenAutoSync({
  userId,
  authLoading,
  gardenLoading,
  syncWithCloud,
}: UseGardenAutoSyncOptions) {
  const runningRef =
    useRef(false);

  const pendingRef =
    useRef(false);

  const loadedUserRef =
    useRef<string | null>(null);

  const [persistedLastSyncedAt,
    setPersistedLastSyncedAt,
  ] = useState<string | null>(null);

  const canSync =
    Boolean(
      userId &&
      !authLoading &&
      !gardenLoading,
    );

  const runSync =
    useCallback(
      async (): Promise<AutoSyncResult> => {
        if (!canSync || !userId) {
          return {
            ok: false,
            error:
              "Синхронизация пока недоступна.",
          };
        }

        if (runningRef.current) {
          pendingRef.current = true;

          return {
            ok: true,
          };
        }

        runningRef.current = true;

        let result: AutoSyncResult = {
          ok: true,
        };

        try {
          do {
            pendingRef.current = false;
            result = await syncWithCloud();

            if (
              result.ok &&
              isValidTimestamp(
                result.syncedAt,
              )
            ) {
              await setMetaValue(
                lastSyncMetaKey(userId),
                result.syncedAt,
              );

              setPersistedLastSyncedAt(
                result.syncedAt,
              );
            }
          } while (
            pendingRef.current &&
            canSync
          );

          return result;
        } finally {
          runningRef.current = false;
        }
      },
      [
        canSync,
        syncWithCloud,
        userId,
      ],
    );

  /**
   * При смене аккаунта заново читаем timestamp
   * последней успешной синхронизации из IndexedDB.
   */
  useEffect(() => {
    if (!userId) {
      loadedUserRef.current = null;
      pendingRef.current = false;
      setPersistedLastSyncedAt(null);
      return;
    }

    if (
      !canSync ||
      loadedUserRef.current === userId
    ) {
      return;
    }

    loadedUserRef.current = userId;
    let active = true;

    void (async () => {
      const stored =
        await getMetaValue<unknown>(
          lastSyncMetaKey(userId),
        );

      if (!active) {
        return;
      }

      const lastSyncedAt =
        isValidTimestamp(stored)
          ? stored
          : null;

      setPersistedLastSyncedAt(
        lastSyncedAt,
      );

      if (
        isDailySyncDue(lastSyncedAt)
      ) {
        void runSync();
      }
    })();

    return () => {
      active = false;
    };
  }, [
    canSync,
    runSync,
    userId,
  ]);

  /**
   * Если приложение остаётся открытым больше суток,
   * выполняем следующий автоматический sync ровно
   * после истечения 24 часов с успешного предыдущего.
   */
  useEffect(() => {
    if (
      !canSync ||
      !persistedLastSyncedAt
    ) {
      return;
    }

    const lastTimestamp =
      Date.parse(
        persistedLastSyncedAt,
      );

    if (!Number.isFinite(lastTimestamp)) {
      return;
    }

    const remaining =
      Math.max(
        0,
        DAILY_SYNC_INTERVAL_MS -
          (Date.now() - lastTimestamp),
      );

    const timeout =
      window.setTimeout(
        () => {
          void runSync();
        },
        remaining,
      );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    canSync,
    persistedLastSyncedAt,
    runSync,
  ]);

  return {
    syncNow: runSync,
  };
}
