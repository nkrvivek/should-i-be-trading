/**
 * Alert Evaluator Hook
 *
 * Evaluates user-defined alert rules (from Supabase alert_rules table)
 * against live market data. When a rule triggers, inserts into alert_history
 * which fires Realtime → AlertBell updates + browser notifications.
 *
 * Should be mounted once at the Dashboard level where market data is available.
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { hasFeature } from "../lib/featureGates";
import type { MarketScore } from "../lib/marketScoring";
import type { TrafficLightVerdict } from "../lib/trafficLight";

type AlertRule = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  enabled: boolean;
  last_triggered_at: string | null;
};

// Minimum time between re-triggering the same rule (1 hour)
const COOLDOWN_MS = 60 * 60 * 1000;

// How often to re-fetch rules from DB (5 minutes)
const RULES_REFRESH_MS = 5 * 60 * 1000;

type EvalContext = {
  vix: number | null;
  marketScore: MarketScore | null;
  verdict: TrafficLightVerdict | null;
};

function canTrigger(rule: AlertRule): boolean {
  if (!rule.last_triggered_at) return true;
  return Date.now() - new Date(rule.last_triggered_at).getTime() > COOLDOWN_MS;
}

/**
 * Evaluate a single rule against current data.
 * Returns a message string if triggered, null otherwise.
 */
function evaluateRule(rule: AlertRule, ctx: EvalContext, prevCtx: EvalContext | null): string | null {
  const config = rule.trigger_config;
  const threshold = typeof config.threshold === "number" ? config.threshold : parseFloat(String(config.threshold ?? "0"));
  const direction = (config.direction as string) ?? "above";

  switch (rule.trigger_type) {
    case "vix_crosses": {
      if (ctx.vix == null) return null;
      if (direction === "above" && ctx.vix >= threshold) {
        // Only trigger on crossing, not while staying above
        if (prevCtx?.vix != null && prevCtx.vix >= threshold) return null;
        return `VIX crossed above ${threshold} — now at ${ctx.vix.toFixed(1)}`;
      }
      if (direction === "below" && ctx.vix <= threshold) {
        if (prevCtx?.vix != null && prevCtx.vix <= threshold) return null;
        return `VIX crossed below ${threshold} — now at ${ctx.vix.toFixed(1)}`;
      }
      return null;
    }

    case "regime_change":
    case "vix_regime_change": {
      if (!ctx.verdict || !prevCtx?.verdict) return null;
      const prevSignal = prevCtx.verdict.signal;
      const currSignal = ctx.verdict.signal;
      if (prevSignal !== currSignal) {
        return `Market signal changed: ${prevSignal} → ${currSignal}`;
      }
      return null;
    }

    case "cri_level_change": {
      if (!ctx.verdict || !prevCtx?.verdict) return null;
      const prevVix = prevCtx.verdict.vixRegime.label;
      const currVix = ctx.verdict.vixRegime.label;
      if (prevVix !== currVix) {
        return `VIX regime changed: ${prevVix} → ${currVix}`;
      }
      return null;
    }

    case "price_crosses": {
      // For price alerts we'd need specific symbol data — for now support SPY via market score
      if (!ctx.marketScore) return null;
      const spyCategory = ctx.marketScore.categories.find((c) => c.name === "Trend");
      if (!spyCategory) return null;
      // Use score as proxy — this is a simplified version
      if (direction === "above" && spyCategory.score >= threshold) {
        if (prevCtx?.marketScore) {
          const prevTrend = prevCtx.marketScore.categories.find((c) => c.name === "Trend");
          if (prevTrend && prevTrend.score >= threshold) return null;
        }
        return `Trend score crossed above ${threshold} (now ${spyCategory.score})`;
      }
      if (direction === "below" && spyCategory.score <= threshold) {
        if (prevCtx?.marketScore) {
          const prevTrend = prevCtx.marketScore.categories.find((c) => c.name === "Trend");
          if (prevTrend && prevTrend.score <= threshold) return null;
        }
        return `Trend score crossed below ${threshold} (now ${spyCategory.score})`;
      }
      return null;
    }

    case "score_drop": {
      if (!ctx.marketScore || !prevCtx?.marketScore) return null;
      const drop = prevCtx.marketScore.total - ctx.marketScore.total;
      if (drop >= threshold) {
        return `Market Quality Score dropped ${drop} pts (${prevCtx.marketScore.total} → ${ctx.marketScore.total})`;
      }
      return null;
    }

    default:
      return null;
  }
}

/** Extract VIX value from MarketScore Volatility category detail string */
function extractVix(score: MarketScore | null): number | null {
  if (!score) return null;
  const volCat = score.categories.find((c) => c.name === "Volatility");
  if (!volCat) return null;
  const match = volCat.detail.match(/VIX\s+([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

export function useAlertEvaluator(
  marketScore: MarketScore | null,
  verdict: TrafficLightVerdict | null,
) {
  const { user, effectiveTier } = useAuthStore();
  const rulesRef = useRef<AlertRule[]>([]);
  const prevCtxRef = useRef<EvalContext | null>(null);
  const lastRulesFetch = useRef(0);

  const fetchRules = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    if (!hasFeature(effectiveTier(), "alerts")) return;

    const now = Date.now();
    if (now - lastRulesFetch.current < RULES_REFRESH_MS && rulesRef.current.length > 0) return;

    const { data } = await supabase
      .from("alert_rules")
      .select("id, name, trigger_type, trigger_config, enabled, last_triggered_at")
      .eq("user_id", user.id)
      .eq("enabled", true);

    if (data) {
      rulesRef.current = data;
      lastRulesFetch.current = now;
    }
  }, [user, effectiveTier]);

  const triggerAlert = useCallback(async (rule: AlertRule, message: string, ctx: EvalContext) => {
    if (!user || !isSupabaseConfigured()) return;

    // Insert into alert_history (triggers Realtime → AlertBell + useAlerts)
    await supabase.from("alert_history").insert({
      user_id: user.id,
      rule_id: rule.id,
      message,
      data: {
        vix: ctx.vix,
        score: ctx.marketScore?.total ?? null,
        signal: ctx.verdict?.signal ?? null,
      },
      delivered: false,
    });

    // Update last_triggered_at on the rule
    await supabase
      .from("alert_rules")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("id", rule.id)
      .eq("user_id", user.id);

    // Update local cache
    const idx = rulesRef.current.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      rulesRef.current[idx].last_triggered_at = new Date().toISOString();
    }
  }, [user]);

  // Evaluate rules whenever data changes
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    if (!hasFeature(effectiveTier(), "alerts")) return;

    const vix = extractVix(marketScore);
    const ctx: EvalContext = { vix, marketScore, verdict };

    // Fetch rules first, then evaluate
    fetchRules().then(() => {
      const prevCtx = prevCtxRef.current;

      for (const rule of rulesRef.current) {
        if (!rule.enabled || !canTrigger(rule)) continue;

        const message = evaluateRule(rule, ctx, prevCtx);
        if (message) {
          triggerAlert(rule, message, ctx);
        }
      }

      // Store current context for next comparison
      prevCtxRef.current = ctx;
    });
  }, [marketScore?.total, verdict?.signal]); // eslint-disable-line react-hooks/exhaustive-deps
}
