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
 * Cross-device sync policy:
 * - sync immediately after an authenticated session becomes ready;
 * - retry periodically while the app remains open;
 * - sync again when the app returns to the foreground or connectivity returns;
 * - serialize concurrent requests and queue one follow-up pass if a trigger
 *   fires during an active sync.
 *
 * Local IndexedDB remains the offline source of truth. Cloud sync is not gated
 * by a 24-hour marker because another device may have changed data at any time.
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

  useEffect(() => {
    if (!canSync || !userId || !initialSyncReady) {
      return;
    }

    // Keep foreground devices reasonably fresh without hammering the API.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void runSync();
      }
    }, 15_000);

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void runSync();
      }
    };

    const syncWhenOnline = () => {
      void runSync();
    };

    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);
    window.addEventListener("online", syncWhenOnline);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.removeEventListener("online", syncWhenOnline);
    };
  }, [
    canSync,
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
