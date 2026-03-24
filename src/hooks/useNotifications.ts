/**
 * Browser Notifications Hook
 *
 * Monitors market score and regime changes, fires browser notifications.
 * Browser-only (no push server needed). Works when tab is open.
 */

import { useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "sibt_notification_prefs";
const LAST_ALERT_KEY = "sibt_last_alerts";
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between same alert type

export type NotificationType =
  | "regime_change"
  | "vix_spike"
  | "score_drop"
  | "fsi_collapse";

type NotificationPrefs = {
  enabled: boolean;
  types: Record<NotificationType, boolean>;
};

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  types: {
    regime_change: true,
    vix_spike: true,
    score_drop: true,
    fsi_collapse: true,
  },
};

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_PREFS;
}

export function setNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function getLastAlerts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LAST_ALERT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function setLastAlert(type: string) {
  const alerts = getLastAlerts();
  alerts[type] = Date.now();
  localStorage.setItem(LAST_ALERT_KEY, JSON.stringify(alerts));
}

function canAlert(type: string): boolean {
  const alerts = getLastAlerts();
  const last = alerts[type];
  if (!last) return true;
  return Date.now() - last > COOLDOWN_MS;
}

function fireNotification(title: string, body: string, tag: string) {
  if (Notification.permission !== "granted") return;
  if (!canAlert(tag)) return;

  try {
    new Notification(title, {
      body,
      icon: "/logo-192.png",
      tag, // prevents duplicate notifications
      silent: false,
    });
    setLastAlert(tag);
  } catch {
    // Notification API not supported or blocked
  }
}

export async function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function useNotifications(
  marketScore: number | null,
  prevSignal: string | null,
  currentSignal: string | null,
  vix: number | null,
) {
  const prevScoreRef = useRef<number | null>(null);

  const checkAndNotify = useCallback(() => {
    const prefs = getNotificationPrefs();
    if (!prefs.enabled) return;
    if (Notification.permission !== "granted") return;

    // Regime change
    if (prefs.types.regime_change && prevSignal && currentSignal && prevSignal !== currentSignal) {
      fireNotification(
        `SIBT: ${currentSignal}`,
        `Market signal changed from ${prevSignal} to ${currentSignal}`,
        "regime_change",
      );
    }

    // VIX spike (above 30)
    if (prefs.types.vix_spike && vix && vix >= 30) {
      fireNotification(
        "SIBT: VIX Alert",
        `VIX spiked to ${vix.toFixed(1)} — defensive posture recommended`,
        "vix_spike",
      );
    }

    // Score drop (below 40 from above 60)
    if (prefs.types.score_drop && marketScore !== null && prevScoreRef.current !== null) {
      if (prevScoreRef.current >= 60 && marketScore < 40) {
        fireNotification(
          "SIBT: Score Drop",
          `Market Quality Score dropped to ${marketScore} from ${prevScoreRef.current}`,
          "score_drop",
        );
      }
    }

    prevScoreRef.current = marketScore;
  }, [marketScore, prevSignal, currentSignal, vix]);

  useEffect(() => {
    checkAndNotify();
  }, [checkAndNotify]);
}

export function sendTestNotification() {
  if (Notification.permission !== "granted") return;
  new Notification("SIBT Test", {
    body: "Notifications are working. You'll be alerted when market conditions change.",
    icon: "/logo-192.png",
    tag: "test",
  });
}
