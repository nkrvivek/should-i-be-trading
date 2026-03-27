import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { Badge } from "../shared/Badge";

export function ProfileForm() {
  const { user, profile, setProfile, effectiveTier } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id)
      .select()
      .single();
    if (!error && data) {
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const currentTier = effectiveTier();
  const tierVariant = currentTier === "pro" ? "positive" : currentTier === "enterprise" ? "info" : "default";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Profile
      </div>

      {/* Avatar + tier */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt={profile?.display_name ?? "Profile"}
            style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-dim)" }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: "var(--accent-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: "var(--accent-text)", fontFamily: "var(--font-mono)",
          }}>
            {(profile?.display_name ?? user?.email ?? "?")[0].toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {profile?.display_name || user?.email?.split("@")[0] || "User"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>Plan:</span>
            <Badge label={currentTier.toUpperCase()} variant={tierVariant} />
          </div>
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Display Name
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "var(--bg-panel-raised)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      </div>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
        {user?.email}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "8px 16px",
          background: "var(--accent-bg)",
          border: "none",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--accent-text)",
          cursor: "pointer",
          alignSelf: "flex-start",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saved ? "SAVED" : saving ? "..." : "SAVE PROFILE"}
      </button>
    </div>
  );
}
