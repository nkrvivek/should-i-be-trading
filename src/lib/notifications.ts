/**
 * Browser push notification utilities for SIBT.
 * Handles: service worker registration, permission, local notifications.
 */

const PREFS_KEY = "sibt_notification_prefs";

export interface NotificationPrefs {
  enabled: boolean;
  regimeChanges: boolean;
  vixSpikes: boolean;
  scoreDrops: boolean;
  fsiCollapse: boolean;
  insiderClusters: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  regimeChanges: true,
  vixSpikes: true,
  scoreDrops: true,
  fsiCollapse: true,
  insiderClusters: true,
};

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setNotificationPrefs(prefs: Partial<NotificationPrefs>): NotificationPrefs {
  const current = getNotificationPrefs();
  const updated = { ...current, ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  return updated;
}

export async function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

export function sendLocalNotification(title: string, body: string, tag?: string): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return;

  new Notification(title, {
    body,
    icon: "/logo-192.png",
    tag: tag || "sibt-alert",
  });
}

export function sendTestNotification(): void {
  sendLocalNotification(
    "SIBT Test Alert",
    "Notifications are working. You'll receive alerts for regime changes, VIX spikes, and more.",
    "sibt-test"
  );
}

/**
 * Check conditions and fire notifications.
 * Call this from the dashboard on each data refresh.
 */
export function checkAndNotify(params: {
  verdict?: string;
  prevVerdict?: string;
  vix?: number;
  prevVix?: number;
  marketScore?: number;
  prevScore?: number;
  fsi?: number;
  prevFsi?: number;
}): void {
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return;

  // Regime change
  if (prefs.regimeChanges && params.verdict && params.prevVerdict && params.verdict !== params.prevVerdict) {
    sendLocalNotification(
      `Regime Change: ${params.verdict}`,
      `Market verdict changed from ${params.prevVerdict} to ${params.verdict}`,
      "regime-change"
    );
  }

  // VIX spike (>10% move)
  if (prefs.vixSpikes && params.vix && params.prevVix) {
    const change = Math.abs(params.vix - params.prevVix) / params.prevVix;
    if (change > 0.10) {
      sendLocalNotification(
        `VIX ${params.vix > params.prevVix ? "Spike" : "Drop"}: ${params.vix.toFixed(1)}`,
        `VIX moved ${(change * 100).toFixed(1)}% from ${params.prevVix.toFixed(1)}`,
        "vix-spike"
      );
    }
  }

  // Score drop (>15 points)
  if (prefs.scoreDrops && params.marketScore != null && params.prevScore != null) {
    if (params.prevScore - params.marketScore > 15) {
      sendLocalNotification(
        `Score Drop: ${params.marketScore}/100`,
        `Market quality dropped from ${params.prevScore} to ${params.marketScore}`,
        "score-drop"
      );
    }
  }

  // FSI collapse (FSI drops below -2)
  if (prefs.fsiCollapse && params.fsi != null && params.prevFsi != null) {
    if (params.fsi < -2 && params.prevFsi >= -2) {
      sendLocalNotification(
        `Financial Stress: ${params.fsi.toFixed(2)}`,
        "Financial Stress Index entered critical zone",
        "fsi-collapse"
      );
    }
  }
}
