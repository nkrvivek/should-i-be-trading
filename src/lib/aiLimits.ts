export type AiLimitTier = "free" | "trial" | "starter" | "pro" | "enterprise";

export const AI_REQUEST_LIMITS: Record<AiLimitTier, number> = {
  free: 5,
  trial: 5,
  starter: 15,
  pro: 25,
  enterprise: 100,
};

export const AI_TOKEN_CAPS: Record<AiLimitTier, number> = {
  free: 1024,
  trial: 1024,
  starter: 2048,
  pro: 2048,
  enterprise: 4096,
};

export const AI_MODEL_OVERRIDES: Partial<Record<AiLimitTier, string>> = {
  free: "claude-sonnet-4-6",
  trial: "claude-sonnet-4-6",
};

export function getAiRequestLimit(tier: AiLimitTier | undefined): number {
  if (!tier) return AI_REQUEST_LIMITS.free;
  return AI_REQUEST_LIMITS[tier] ?? AI_REQUEST_LIMITS.free;
}

export function getAiTokenCap(tier: AiLimitTier | undefined): number {
  if (!tier) return AI_TOKEN_CAPS.free;
  return AI_TOKEN_CAPS[tier] ?? AI_TOKEN_CAPS.free;
}
