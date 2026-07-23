# Product idea — Leadership / CEO signals ("fun metrics")

Captured 2026-07-22 from user: "we got to do these fun metrics and signals as well as part of sibt.ai, based on the personality and perception of the CEO also as a factor for long term performance of the stock and company." Inspiration: @leevalueroach joke tweet (deep-value screen ranked by CEO age + auditor's-letter "concern" mentions) — the joke works because the underlying signals are real.

## Buildable now w/ existing SIBT rails
- **Auditor "going concern" flag** — SEC EDGAR full-text (sec-edgar fn exists): scan latest 10-K auditor letter for going-concern language. Binary red flag, genuinely predictive.
- **CEO tenure + age + founder-status** — FMP company profile (fmp fn exists). Founder-led premium is a documented factor.
- **Insider conviction** — CEO's own buys/sells vs comp-driven sales (uw_insider-class data; SIBT has finra/sec rails).
- **Earnings-call tone delta** — transcript sentiment vs prior quarters (Benzinga/FMP transcripts): hedging-language density, guidance-confidence shift.
- **Perception layer** — news + social sentiment ABOUT the CEO specifically (existing sentiment rails, entity-filtered).
- **Promise ledger** (the fun one) — LLM extracts CEO promises from past calls ("we'll ship X by Q3") and scores kept/missed rate over time. Nobody does this; SIBT has the LLM rails.

## Shape
A "Leadership" pillar (0-10) alongside the SIBT Score, w/ the fun-metric badges surfaced in UI (founder-led · promise-keeper 78% · zero going-concern · insider buyer). Composite feeds long-term ranking, badges feed shareability/marketing.

## Status: idea, post-relaunch backlog. Do NOT build before launch gates clear.
