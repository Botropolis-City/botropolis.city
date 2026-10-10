const KEY = "botropolis.shortcuts";

export function shouldHandle(e: KeyboardEvent, enabled: boolean): boolean {
  if (!enabled || e.ctrlKey || e.metaKey || e.altKey) return false;
  const t = e.target;
  if (t instanceof HTMLElement) {
    if (t.isContentEditable || t.contentEditable === "true") return false;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return false;
  }
  return true;
}

export function loadEnabled(storage: Storage): boolean {
  try {
    return storage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveEnabled(storage: Storage, on: boolean): void {
  try {
    storage.setItem(KEY, on ? "on" : "off");
  } catch {
    return;
  }
}
