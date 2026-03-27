/**
 * Centralized error sanitizer — strips secrets from error objects
 * before returning them to clients.
 */
export function sanitizeError(obj: unknown): unknown {
  const str = JSON.stringify(obj);
  return JSON.parse(
    str
      .replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, "[REDACTED]")
      .replace(/sbp_[a-zA-Z0-9]{20,}/g, "[REDACTED]")
      .replace(/sk_(live|test)_[a-zA-Z0-9]{20,}/g, "[REDACTED]")
      .replace(/whsec_[a-zA-Z0-9]{20,}/g, "[REDACTED]")
      .replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[REDACTED_JWT]")
      .replace(/Bearer\s+[a-zA-Z0-9_.-]{20,}/gi, "Bearer [REDACTED]")
      .replace(/[Aa]pi[_-]?[Kk]ey["\s:=]+[a-zA-Z0-9_.-]{10,}/g, "apiKey=[REDACTED]")
      .replace(/token["\s:=]+[a-zA-Z0-9_.-]{20,}/gi, "token=[REDACTED]")
  );
}
