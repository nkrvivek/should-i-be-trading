import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { hasFeature } from "../../lib/featureGates";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

/**
 * Alert bell icon for the nav bar.
 * Shows unread alert count as a red badge.
 * Clicking navigates to /alerts page.
 * Only visible for pro/enterprise users.
 */
export function AlertBell() {
  const { user, effectiveTier } = useAuthStore();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPopover, setShowPopover] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<{ id: string; message: string; created_at: string }[]>([]);

  const visible = !!user && hasFeature(effectiveTier(), "alerts");

  const fetchUnread = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) return;
    const { count } = await supabase
      .from("alert_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("delivered", false);
    setUnreadCount(count ?? 0);
  }, [user]);

  const fetchRecent = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) return;
    const { data } = await supabase
      .from("alert_history")
      .select("id, message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentAlerts(data);
  }, [user]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!visible) return;
    fetchUnread(); // eslint-disable-line react-hooks/set-state-in-effect

    if (!isSupabaseConfigured() || !user) return;
    const channel = supabase
      .channel("alert-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_history", filter: `user_id=eq.${user.id}` },
        () => {
          setUnreadCount((prev) => prev + 1);
          fetchRecent();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, visible, fetchUnread, fetchRecent]);

  // Don't render if user doesn't have alerts feature
  if (!visible) return null;

  const handleClick = () => {
    if (showPopover) {
      setShowPopover(false);
    } else {
      fetchRecent();
      setShowPopover(true);
    }
  };

  const handleViewAll = async () => {
    // Mark all as delivered when navigating to alerts page
    if (unreadCount > 0 && user) {
      await supabase
        .from("alert_history")
        .update({ delivered: true })
        .eq("user_id", user.id)
        .eq("delivered", false);
      setUnreadCount(0);
    }
    setShowPopover(false);
    navigate("/alerts");
  };

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={handleClick}
        title="Alerts"
        style={{
          background: "none",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
          padding: "4px 8px",
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Bell SVG */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: unreadCount > 9 ? 18 : 16,
            height: 16,
            borderRadius: 999,
            background: "var(--negative)",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover dropdown */}
      {showPopover && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowPopover(false)}
            style={{ position: "fixed", inset: 0, zIndex: 98 }}
          />
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            maxHeight: 360,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: 6,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            zIndex: 99,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border-dim)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                Alerts
              </span>
              {unreadCount > 0 && (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--negative)",
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>

            {/* Alert list */}
            <div style={{ flex: 1, overflow: "auto" }}>
              {recentAlerts.length === 0 ? (
                <div style={{
                  padding: 20,
                  textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}>
                  No recent alerts
                </div>
              ) : (
                recentAlerts.map((a) => (
                  <div key={a.id} style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border-dim)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}>
                    <span style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                      flex: 1,
                    }}>
                      {a.message}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <button
              onClick={handleViewAll}
              style={{
                padding: "10px 14px",
                borderTop: "1px solid var(--border-dim)",
                background: "var(--bg-panel-raised)",
                border: "none",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--signal-core)",
                cursor: "pointer",
                textAlign: "center",
                letterSpacing: "0.04em",
              }}
            >
              VIEW ALL ALERTS & MANAGE RULES
            </button>
          </div>
        </>
      )}
    </div>
  );
}
