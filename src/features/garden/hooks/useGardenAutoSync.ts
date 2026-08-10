import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import type {
  UserPlant,
} from "../types";

export interface AutoSyncResult {
  ok: boolean;
  error?: string;
  syncedAt?: string;
}

export interface UseGardenAutoSyncOptions {
  userId: string | null;

  authLoading: boolean;

  gardenLoading: boolean;

  plants: UserPlant[];

  syncWithCloud:
    () => Promise<AutoSyncResult>;
}

const CHANGE_SYNC_DELAY_MS = 1500;

const PERIODIC_SYNC_INTERVAL_MS =
  5 * 60 * 1000;

/**
 * Отвечает только за то,
 * КОГДА запускать синхронизацию.
 *
 * Сам алгоритм sync/LWW остаётся
 * внутри garden sync layer.
 */
export function useGardenAutoSync({
  userId,
  authLoading,
  gardenLoading,
  plants,
  syncWithCloud,
}: UseGardenAutoSyncOptions) {
  const runningRef =
    useRef(false);

  const initialUserRef =
    useRef<string | null>(null);

  /**
   * Меняется при:
   *
   * - добавлении растения;
   * - редактировании;
   * - поливе;
   * - заметках;
   * - напоминаниях;
   * - удалении.
   *
   * При soft-delete растение исчезает
   * из active plants, поэтому ключ
   * тоже изменяется.
   */
  const localChangeKey =
    useMemo(
      () =>
        plants
          .map(
            plant =>
              `${plant.id}:${plant.updatedAt}`,
          )
          .sort()
          .join("|"),
      [plants],
    );

  const canSync =
    Boolean(
      userId &&
      !authLoading &&
      !gardenLoading,
    );

  const runSync =
    useCallback(
      async (): Promise<AutoSyncResult> => {
        if (!canSync) {
          return {
            ok: false,
            error:
              "Синхронизация пока недоступна.",
          };
        }

        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          /*
           * syncWithCloud сам выставляет
           * статус offline.
           */
          return syncWithCloud();
        }

        if (runningRef.current) {
          return {
            ok: false,
            error:
              "Синхронизация уже выполняется.",
          };
        }

        runningRef.current =
          true;

        try {
          return await syncWithCloud();
        } finally {
          runningRef.current =
            false;
        }
      },
      [
        canSync,
        syncWithCloud,
      ],
    );

  /**
   * При logout разрешаем сделать
   * initial sync снова после
   * следующего входа.
   */
  useEffect(() => {
    if (!userId) {
      initialUserRef.current =
        null;
    }
  }, [userId]);

  /**
   * Первый sync после входа.
   */
  useEffect(() => {
    if (
      !canSync ||
      !userId
    ) {
      return;
    }

    if (
      initialUserRef.current ===
      userId
    ) {
      return;
    }

    initialUserRef.current =
      userId;

    void runSync();
  }, [
    canSync,
    userId,
    runSync,
  ]);

  /**
   * После локального изменения
   * ждём 1.5 секунды.
   *
   * Это объединяет серию быстрых
   * действий пользователя в один sync.
   */
  useEffect(() => {
    if (
      !canSync ||
      !userId ||
      initialUserRef.current !==
        userId
    ) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          void runSync();
        },
        CHANGE_SYNC_DELAY_MS,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    canSync,
    userId,
    localChangeKey,
    runSync,
  ]);

  /**
   * Интернет снова появился.
   */
  useEffect(() => {
    if (!canSync) {
      return;
    }

    const handleOnline =
      () => {
        void runSync();
      };

    window.addEventListener(
      "online",
      handleOnline,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );
    };
  }, [
    canSync,
    runSync,
  ]);

  /**
   * Пользователь вернулся
   * в приложение.
   */
  useEffect(() => {
    if (!canSync) {
      return;
    }

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void runSync();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    canSync,
    runSync,
  ]);

  /**
   * Страховочная синхронизация
   * раз в 5 минут, пока приложение
   * открыто.
   *
   * Это не основной механизм,
   * а резервный.
   */
  useEffect(() => {
    if (!canSync) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void runSync();
          }
        },
        PERIODIC_SYNC_INTERVAL_MS,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    canSync,
    runSync,
  ]);

  return {
    syncNow: runSync,
  };
}