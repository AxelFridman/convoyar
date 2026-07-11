/** Notificaciones del sistema (Web Notifications). Push real: ver README §Push. */
export async function requestNotifPermission(): Promise<boolean> {
  try {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

export function systemNotify(title: string, body: string): void {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    /* entornos sin soporte */
  }
}
