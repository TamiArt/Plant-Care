export const APP_TABS = ["home", "garden", "catalog", "checklist", "add"] as const;

export type Tab = typeof APP_TABS[number];

export function isTab(value: string | null): value is Tab {
  return value !== null && APP_TABS.some(tab => tab === value);
}

export function getInitialTab(search: string): Tab {
  const screen = new URLSearchParams(search).get("screen");
  return isTab(screen) ? screen : "home";
}
