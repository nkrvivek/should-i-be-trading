import { useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

type Props = {
  onSuccess?: () => void;
};

export function AuthGate({ onSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
        Auth not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split("@")[0] } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 380,
        margin: "80px auto",
        padding: 32,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--signal-core)" }}>
          SIBT
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          {mode === "login" ? "Sign in to your account" : "Create your account"}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "signup" && (
          <Input label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
        )}
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="Min 6 characters" required />

        {error && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--negative)", padding: "4px 0" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "var(--accent-bg)",
            border: "none",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--accent-text)",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
            marginTop: 4,
          }}
        >
          {loading ? "..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--signal-core)",
            cursor: "pointer",
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>

      <div style={{ marginTop: 24, padding: "12px 0", borderTop: "1px solid var(--border-dim)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "var(--text-muted)", lineHeight: 1.6 }}>
          SIBT provides analytical tools and market data. It does not provide investment advice.
          By signing up you agree to our Terms of Service and acknowledge that all trading
          decisions are your own responsibility.
        </div>
      </div>
    </div>
  );
}

function Input({
  label, type = "text", value, onChange, placeholder, required,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--bg-panel-raised)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
    </div>
  );
}
