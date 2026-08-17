import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  UserPlant,
} from "../types";

import {
  getMetaValue,
  setMetaValue,
} from "../repository/gardenRepository";

import {
  getDailySyncDelay,
  isDailySyncDue,
  isValidSyncTimestamp,
} from "../model/syncSchedule";

export interface AutoSyncResult {
  ok: boolean;
  error?: string;
  syncedAt?: string;
}

export interface UseGardenAutoSyncOptions {
  userId: string | null;
  authLoading: boolean;
  gardenLoading: boolean;

  /**
   * Сохраняем в контракте хука для совместимости
   * с App. Изменения plants больше не запускают sync.
   */
  plants: UserPlant[];

  syncWithCloud:
    () => Promise<AutoSyncResult>;
}

function lastSyncMetaKey(
  userId: string,
): string {
  return `garden:lastSyncedAt:${userId}`;
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
              isValidSyncTimestamp(
                result.syncedAt,
              )
            ) {
              setPersistedLastSyncedAt(
                result.syncedAt,
              );

              try {
                await setMetaValue(
                  lastSyncMetaKey(userId),
                  result.syncedAt,
                );
              } catch {
                /*
                 * Сам sync уже успешен. Ошибка записи
                 * служебного timestamp не должна его
                 * превращать в ошибку пользователя.
                 */
              }
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
      let stored: unknown;

      try {
        stored =
          await getMetaValue<unknown>(
            lastSyncMetaKey(userId),
          );
      } catch {
        stored = null;
      }

      if (!active) {
        return;
      }

      const lastSyncedAt =
        isValidSyncTimestamp(stored)
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
   * выполняем следующий автоматический sync после
   * истечения 24 часов с успешного предыдущего.
   */
  useEffect(() => {
    if (
      !canSync ||
      !persistedLastSyncedAt
    ) {
      return;
    }

    const delay =
      getDailySyncDelay(
        persistedLastSyncedAt,
      );

    if (delay === null) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          void runSync();
        },
        delay,
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
