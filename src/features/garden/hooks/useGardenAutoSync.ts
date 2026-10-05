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
  syncWithCloud: () => Promise<AutoSyncResult>;
}

function lastSyncMetaKey(userId: string): string {
  return `garden:lastSyncedAt:${userId}`;
}

/**
 * Synchronization policy:
 * - the first authenticated app session always syncs immediately;
 * - the UI is not considered ready until that initial attempt finishes;
 * - later manual syncs remain available at any time;
 * - while the app stays open, a successful sync is refreshed periodically.
 *
 * The previous 24-hour gate was intentionally removed. It allowed a device
 * opened at 15:00 to continue using a stale local snapshot even when another
 * device had changed the same plant at 14:10.
 */
export function useGardenAutoSync({
  userId,
  authLoading,
  gardenLoading,
  syncWithCloud,
}: UseGardenAutoSyncOptions) {
  const runningRef = useRef(false);
  const pendingRef = useRef(false);
  const initializedUserRef = useRef<string | null>(null);
  const [initialSyncReady, setInitialSyncReady] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const canSync = Boolean(
    userId &&
    !authLoading &&
    !gardenLoading,
  );

  const runSync = useCallback(async (): Promise<AutoSyncResult> => {
    if (!canSync || !userId) {
      return {
        ok: false,
        error: "Синхронизация пока недоступна.",
      };
    }

    if (runningRef.current) {
      pendingRef.current = true;
      return { ok: true };
    }

    runningRef.current = true;

    let result: AutoSyncResult = { ok: true };

    try {
      do {
        pendingRef.current = false;
        result = await syncWithCloud();

        if (result.syncedAt) {
          setLastSyncedAt(result.syncedAt);
          try {
            await setMetaValue(
              lastSyncMetaKey(userId),
              result.syncedAt,
            );
          } catch {
            // Sync itself succeeded; metadata is only a local convenience.
          }
        }
      } while (pendingRef.current && canSync);

      return result;
    } finally {
      runningRef.current = false;
    }
  }, [
    canSync,
    syncWithCloud,
    userId,
  ]);

  useEffect(() => {
    if (authLoading || gardenLoading) {
      setInitialSyncReady(false);
      return;
    }

    if (!userId) {
      initializedUserRef.current = null;
      pendingRef.current = false;
      setLastSyncedAt(null);
      setInitialSyncReady(true);
      return;
    }

    if (
      initializedUserRef.current === userId &&
      initialSyncReady
    ) {
      return;
    }

    initializedUserRef.current = userId;
    let active = true;

    void (async () => {
      try {
        const stored = await getMetaValue<unknown>(
          lastSyncMetaKey(userId),
        );

        if (
          active &&
          typeof stored === "string" &&
          Number.isFinite(Date.parse(stored))
        ) {
          setLastSyncedAt(stored);
        }
      } catch {
        // A missing local sync marker must never block synchronization.
      }

      if (!active) return;

      await runSync();

      if (active) {
        setInitialSyncReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    authLoading,
    gardenLoading,
    initialSyncReady,
    runSync,
    userId,
  ]);

  return {
    syncNow: runSync,
    initialSyncReady,
    lastSyncedAt,
  };
}
