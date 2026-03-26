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
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-muted)" }}>
        Auth not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
      </div>
    );
  }

  const handleOAuthSignIn = async (provider: "google" | "twitter" | "x") => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : `${provider} sign-in failed`);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;

        // Check if user already exists (Supabase returns user with empty identities)
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error("An account with this email already exists. Try signing in instead.");
        }

        // Welcome email is handled server-side by a DB webhook
        // (INSERT on auth.users → calls send-welcome-email with service role key).
        // Set up the webhook in Supabase Dashboard → Database → Webhooks.

        // If email confirmation is required, user won't have a session yet
        if (data.user && !data.session) {
          setSignupSuccess(true);
          setLoading(false);
          return;
        }
        // If auto-confirm is on, we get a session immediately
        onSuccess?.();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div
        style={{
          maxWidth: 380,
          margin: "80px auto",
          padding: 32,
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--signal-core)", marginBottom: 12 }}>
          Check your email
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
          We sent a confirmation link to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
          Click the link to activate your account and start your 14-day free trial.
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
          Didn't get it? Check your spam folder or{" "}
          <button
            onClick={() => { setSignupSuccess(false); setMode("signup"); }}
            style={{ background: "none", border: "none", color: "var(--signal-core)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12 }}
          >
            try again
          </button>
        </div>
      </div>
    );
  }

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
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--text-muted)", marginTop: 4 }}>
          {mode === "login" ? "Sign in to your account" : "Create your account"}
        </div>
      </div>

      {/* OAuth buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => handleOAuthSignIn("google")}
          disabled={loading}
          style={oauthBtnStyle(loading)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <button
          onClick={() => handleOAuthSignIn("x")}
          disabled={loading}
          style={oauthBtnStyle(loading)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-primary)">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Continue with X
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border-dim)" }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>OR</span>
        <div style={{ flex: 1, height: 1, background: "var(--border-dim)" }} />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "signup" && (
          <Input label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
        )}
        <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="Min 6 characters" required />

        {error && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)", padding: "4px 0" }}>
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
            fontSize: 14,
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
            fontSize: 13,
            color: "var(--signal-core)",
            cursor: "pointer",
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>

      <div style={{ marginTop: 24, padding: "12px 0", borderTop: "1px solid var(--border-dim)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
          SIBT provides analytical tools and market data. It does not provide investment advice.
          By signing up you agree to our Terms of Service and acknowledge that all trading
          decisions are your own responsibility.
        </div>
      </div>
    </div>
  );
}

function oauthBtnStyle(loading: boolean): React.CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 16px",
    background: "var(--bg-panel-raised)",
    border: "1px solid var(--border-dim)",
    borderRadius: 4,
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    fontWeight: 500,
    color: "var(--text-primary)",
    cursor: loading ? "default" : "pointer",
    opacity: loading ? 0.6 : 1,
  };
}

function Input({
  label, type = "text", value, onChange, placeholder, required,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
          fontSize: 14,
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
    </div>
  );
}
