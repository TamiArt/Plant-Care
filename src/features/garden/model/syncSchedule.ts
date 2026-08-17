export const DAILY_SYNC_INTERVAL_MS =
  24 * 60 * 60 * 1000;

export function isValidSyncTimestamp(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value))
  );
}

export function isDailySyncDue(
  lastSyncedAt: string | null,
  now = Date.now(),
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
    now - timestamp >=
    DAILY_SYNC_INTERVAL_MS
  );
}

export function getDailySyncDelay(
  lastSyncedAt: string,
  now = Date.now(),
): number | null {
  const timestamp =
    Date.parse(lastSyncedAt);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max(
    0,
    DAILY_SYNC_INTERVAL_MS -
      (now - timestamp),
  );
}
