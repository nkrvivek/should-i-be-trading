import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * Email-confirmation landing: /auth/confirm/:tokenHash?type=signup
 *
 * The token travels as a PATH segment, not a query value. Supabase's mailer
 * pipeline double-decodes quoted-printable and destroys any `=` followed by
 * two hex characters — which is exactly what `?token=<hex-hash>` produces
 * (found 2026-07-23: four mangled confirmation emails, token's first two hex
 * chars consumed as a QP escape). A path segment contains no `=`, so the
 * link survives every mailer. `type` rides as a query param safely: `=si`
 * is not valid QP hex.
 */
// One verification promise per token, module-level: the token is single-use,
// and React StrictMode mounts effects twice in dev — without this the second
// invocation consumes an already-used token and paints a false failure over
// a successful confirmation (observed 2026-07-23 on staging).
const verifications = new Map<string, Promise<{ error: { message: string } | null }>>();

export default function AuthConfirmPage() {
  const { tokenHash } = useParams<{ tokenHash: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!tokenHash) {
        setError("Missing confirmation token.");
        return;
      }
      const type = (params.get("type") ?? "signup") as
        | "signup"
        | "email"
        | "recovery"
        | "invite"
        | "email_change";
      let pending = verifications.get(tokenHash);
      if (!pending) {
        pending = supabase.auth.verifyOtp({ type, token_hash: tokenHash });
        verifications.set(tokenHash, pending);
      }
      const { error: verifyError } = await pending;
      if (cancelled) return;
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      navigate("/paper", { replace: true });
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, params, navigate]);

  return (
    <div style={{ maxWidth: 480, margin: "120px auto", textAlign: "center" }}>
      {error ? (
        <>
          <h2>Confirmation failed</h2>
          <p>{error}</p>
          <p>
            The link may have expired. <a href="/login">Sign in</a> to request
            a new one.
          </p>
        </>
      ) : (
        <h2>Confirming your email…</h2>
      )}
    </div>
  );
}
