/**
 * Persistencia segura: localStorage cuando está disponible (web self-hosted,
 * PWA, Capacitor) con fallback en memoria (iframes restringidos, incógnito).
 */
const KEY = "caravana:v2";
let memory: string | null = null;

function canUseLocalStorage(): boolean {
  try {
    const k = "__caravana_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
const hasLS = typeof window !== "undefined" && canUseLocalStorage();

export function loadState<T>(): T | null {
  try {
    const raw = hasLS ? window.localStorage.getItem(KEY) : memory;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveState<T>(state: T): void {
  try {
    const raw = JSON.stringify(state);
    if (hasLS) window.localStorage.setItem(KEY, raw);
    else memory = raw;
  } catch {
    /* sin espacio o bloqueado: la app sigue funcionando en memoria */
  }
}

export function clearState(): void {
  try {
    if (hasLS) window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  memory = null;
}

export const storageMode: "local" | "memoria" = hasLS ? "local" : "memoria";
