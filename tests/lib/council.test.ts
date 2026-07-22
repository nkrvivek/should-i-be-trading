import { describe, it, expect } from "vitest";
import {
  aggregateVotes,
  extractJsonBlock,
  parsePersonaResponse,
  personaOutcomeFromSettled,
  resolveAiLimitTier,
  checkCouncilBudget,
  type PersonaVerdict,
} from "../../src/lib/council";

function makeVerdict(overrides: Partial<PersonaVerdict> = {}): PersonaVerdict {
  return {
    persona: "risk-manager",
    vote: "approve",
    reason: "Position size is well within the per-name cap.",
    ...overrides,
  };
}

describe("aggregateVotes", () => {
  it("counts approve and reject votes separately", () => {
    const votes = [
      makeVerdict({ persona: "risk-manager", vote: "approve" }),
      makeVerdict({ persona: "technician", vote: "approve" }),
      makeVerdict({ persona: "macro", vote: "reject" }),
      makeVerdict({ persona: "income-strategist", vote: "abstain" }),
      makeVerdict({ persona: "devils-advocate", vote: "reject" }),
    ];

    const verdict = aggregateVotes(votes);

    expect(verdict.approve_count).toBe(2);
    expect(verdict.reject_count).toBe(2);
    expect(verdict.votes).toHaveLength(5);
  });

  it("counts an all-abstain council as zero approvals and zero rejections", () => {
    const votes = [
      makeVerdict({ persona: "risk-manager", vote: "abstain" }),
      makeVerdict({ persona: "technician", vote: "abstain" }),
    ];

    const verdict = aggregateVotes(votes);

    expect(verdict.approve_count).toBe(0);
    expect(verdict.reject_count).toBe(0);
    expect(verdict.votes).toEqual(votes);
  });
});

describe("extractJsonBlock", () => {
  it("extracts the JSON body from a markdown code-fenced response", () => {
    const text = '```json\n{"vote":"approve","reason":"looks fine","confidence":0.8}\n```';
    expect(extractJsonBlock(text)).toBe('{"vote":"approve","reason":"looks fine","confidence":0.8}');
  });

  it("extracts the JSON body when the model adds a leading sentence", () => {
    const text = 'Here is my verdict: {"vote":"reject","reason":"too risky","confidence":0.6} Thanks.';
    expect(extractJsonBlock(text)).toBe('{"vote":"reject","reason":"too risky","confidence":0.6}');
  });

  it("returns null when the text has no brace-delimited block", () => {
    expect(extractJsonBlock("I cannot evaluate this proposal.")).toBeNull();
  });
});

describe("parsePersonaResponse (defensive JSON parsing)", () => {
  it("parses a well-formed persona response", () => {
    const result = parsePersonaResponse('{"vote":"approve","reason":"Sized fine.","confidence":0.75}');
    expect(result).toEqual({ vote: "approve", reason: "Sized fine.", confidence: 0.75 });
  });

  it("falls back to the unparseable sentinel when the text isn't valid JSON", () => {
    const result = parsePersonaResponse("{vote: approve, not real json}");
    expect(result).toEqual({ vote: "abstain", reason: "unparseable", confidence: 0 });
  });

  it("falls back to the unparseable sentinel when vote is missing or invalid", () => {
    const result = parsePersonaResponse('{"vote":"maybe","reason":"unsure"}');
    expect(result).toEqual({ vote: "abstain", reason: "unparseable", confidence: 0 });
  });

  it("falls back to the unparseable sentinel when there is no JSON at all", () => {
    const result = parsePersonaResponse("");
    expect(result).toEqual({ vote: "abstain", reason: "unparseable", confidence: 0 });
  });

  it("truncates an overlong reason to 200 characters", () => {
    const longReason = "x".repeat(400);
    const result = parsePersonaResponse(`{"vote":"reject","reason":"${longReason}"}`);
    expect(result.reason).toHaveLength(200);
  });

  it("defaults confidence to 0.5 when missing or out of range", () => {
    const missing = parsePersonaResponse('{"vote":"approve","reason":"ok"}');
    const outOfRange = parsePersonaResponse('{"vote":"approve","reason":"ok","confidence":1.5}');
    expect(missing.confidence).toBe(0.5);
    expect(outOfRange.confidence).toBe(0.5);
  });
});

describe("personaOutcomeFromSettled (Promise.allSettled -> vote, never throws)", () => {
  it("turns a rejected promise into an abstain vote with an unparseable reason", () => {
    const settled: PromiseSettledResult<string> = {
      status: "rejected",
      reason: new Error("Anthropic API error 529: overloaded"),
    };

    const outcome = personaOutcomeFromSettled("macro", settled);

    expect(outcome).toEqual({ persona: "macro", vote: "abstain", reason: "unparseable" });
  });

  it("parses a fulfilled promise's text into a real vote", () => {
    const settled: PromiseSettledResult<string> = {
      status: "fulfilled",
      value: '{"vote":"reject","reason":"Thesis unsupported by flow.","confidence":0.9}',
    };

    const outcome = personaOutcomeFromSettled("devils-advocate", settled);

    expect(outcome).toEqual({
      persona: "devils-advocate",
      vote: "reject",
      reason: "Thesis unsupported by flow.",
    });
  });
});

describe("resolveAiLimitTier (copilot -> pro mapping)", () => {
  it("maps the copilot tier onto pro's AI budget", () => {
    expect(resolveAiLimitTier("copilot")).toBe("pro");
  });

  it("defaults an undefined tier to free", () => {
    expect(resolveAiLimitTier(undefined)).toBe("free");
  });

  it("passes through a recognized AiLimitTier unchanged", () => {
    expect(resolveAiLimitTier("enterprise")).toBe("enterprise");
  });
});

describe("checkCouncilBudget (cost guard before the 5 persona calls)", () => {
  it("rejects with daily_ai_budget_exceeded once usage meets the tier's daily limit", () => {
    // pro = 25 requests/day (src/lib/aiLimits.ts AI_REQUEST_LIMITS)
    const result = checkCouncilBudget({ tier: "pro", requestsUsedToday: 25 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("daily_ai_budget_exceeded");
      expect(result.detail.limit).toBe(25);
    }
  });

  it("passes when usage is still under the tier's daily limit", () => {
    const result = checkCouncilBudget({ tier: "pro", requestsUsedToday: 24 });
    expect(result.ok).toBe(true);
  });

  it("applies pro's limit to the copilot tier via the shared mapping", () => {
    const result = checkCouncilBudget({ tier: "copilot", requestsUsedToday: 25 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail.aiTier).toBe("pro");
  });

  it("falls back to free's limit when no tier is known", () => {
    // free = 5 requests/day
    const result = checkCouncilBudget({ tier: undefined, requestsUsedToday: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail.limit).toBe(5);
  });
});
