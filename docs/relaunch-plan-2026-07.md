# SIBT Relaunch Plan — agentic trading w/ HITL (2026-07-21)

User directive 2026-07-21: reopen the project, drop the education pivot, focus
on the core agentic trading setup with human-in-the-loop approvals, fold in
the features built since April (autopilot engine, AI council, AI hedge fund,
World Monitor, data-source stack), refresh site + docs + codebase, ship as a
paid service on the existing Stripe rails.

## Audit summary (3-agent sweep, 2026-07-21 eve)

**Strong foundation, 3.5 months stale (last commit 2026-04-01):**
- React 19 + Vite SPA on Cloudflare Pages (sibt.ai + should-i-be-trading.pages.dev), Supabase backend.
- **Stripe: complete and wired** — checkout, customer portal, idempotent webhook, 4 tiers in schema (free/starter $12/pro $29/enterprise unpriced), 14-day no-card trials, tier-sync triggers, per-tier feature gates (~20 features via featureGates.ts).
- **Broker layer already multi-broker**: SnapTrade + IBKR + E-Trade + Schwab + Tradier + Webull edge functions, broker abstraction registry, OrderReviewModal (manual pre-trade approval — the HITL seed).
- Data proxies server-side: UW, Finnhub, FRED, FMP, SEC EDGAR/13F, CFTC, FINRA, congress, social, Exa, Anthropic (per-tier rate limits via ai_usage).
- MQS engine + traffic-light verdict + composite trade score + daily briefing + trade journal. 148 unit tests / 22 e2e claimed (unverified since April).
- Education layer cleanly isolated: ~12 files + /learn route + academy docs + part of /progress. 7 orphaned page files confirmed dead.
- Current positioning explicitly "does not execute trades" (README disclaimer).

## Phases

### Phase 0 — Revive + baseline (first session)
- npm install, run unit + e2e suites, tsc build; record actual pass counts vs the April claims.
- Verify live infra: Supabase project up, Stripe secrets/price IDs present, CF Pages deploy path works (deploy a no-op change).
- Dependency + security pass (3.5 months of npm drift).
- Exit: green build deployed to pages.dev preview.

### Phase 1 — Cut + clean
- Remove education: GlossaryPage/AcademyView/GlossaryView/LessonViewer, academy*.ts, learning*.ts, useLearningAcademy, academyMarketing, /learn + /glossary routes, send-learning-reminders function, learning-academy/reminders docs.
- Split /progress → journal-only page (it mixes education + trade journal).
- Delete 7 orphaned pages (RegimePage, AnalysisPage, EarningsPage, InsiderPage, TerminalPage, MacroPage, BacktestPage).
- Prune tests for removed features; update README/docs claims.
- Exit: education-free product, suite green.

### Phase 2 — Agentic core w/ HITL (the meat)
Port the proven autopilot patterns (bildof rail, hardened 2026-07-21) to multi-tenant Supabase:
- **Proposal engine**: per-user staged proposals (tables: proposals, approvals, executions — append-only history). Gates ported from bildof/autopilot: per-name open-risk cap w/ ledger (the 7/21 fix), CC coverage guard, R20 live re-quote at execute, R22 live position verify, no-margin check, earnings gate.
- **HITL approvals**: in-app approve/reject + email magic links (24h token = proposal TTL — 7/21 fix), explicit per-trade user tap. Execute via the user's connected broker (broker-snaptrade edge fn has the trade path).
- **AI council as product**: proposal → multi-persona model panel verdict shown pre-approval ("3 of 5 personas approve, dissent: ..."), per-tier model budgets on existing ai_usage rails.
- **Why-this-trade transparency**: regime + factor gate + signal confluence attached to every proposal.
- Exit: one end-to-end customer flow — connect broker → receive proposal w/ council verdict → tap approve → order placed → fill verified → journal entry.

### Phase 3 — Intelligence expansion
- **World Monitor**: self-hosted instance (AGPL-safe as a separate service we run; NO embedding of their UI/brand w/o commercial license) feeding a geo-risk panel + chokepoint/energy-disruption context into proposals and the daily briefing.
- **AI Hedge Fund showcase**: live paper-book transparency page (committee reasoning + ledger) as marketing + a tier feature.
- Surface the quality-data stack (CoT, EDGAR watch, IV-crush ledger patterns) into research.

### Phase 4 — Content + site refresh
- Landing/features/pricing rewritten to agentic + HITL positioning (six writing rules; every line passes the swap test).
- Pricing remap on existing Stripe rails (see open decision 1).
- README, LAUNCH_ASSETS, LAUNCH_PLAYBOOK refreshed; kill the aspirational SEO-page claims that were never built.

### Phase 5 — Ship
- Full suite + e2e, staged deploy, Stripe products updated, terms/risk-disclosure updated for the execution tier, relaunch per playbook.

## Decisions (user, 2026-07-21)
1. **Tier map DECIDED**: Free (verdict + regime) · Pro $29 (signals, council reads, briefings, research) · **Copilot ~$99 (HITL execution)**. Starter retired; enterprise stays dark.
2. **Execution posture DECIDED: HITL + opt-in auto for small sizes.** Auto ships ONLY behind explicit per-user opt-in + hard per-trade/per-day size caps + kill switch, defaulting off. Flag (stated once, decision respected): autonomous customer execution changes the compliance surface vs the current user-decides disclaimer — get counsel review before the auto path exits beta.
3. **World Monitor DECIDED: self-host** our instance as a separate service feeding derived signals.
4. **Brand**: keep SIBT identity, reposition (no rename directive given).

## Constraints carried from the trading stack
- Data-vendor terms: resell derived signals (our scores/verdicts), never raw vendor data passthrough.
- The personal/bildof/autopilot books stay fully separate from customer infra — shared code, never shared keys/accounts/state.
