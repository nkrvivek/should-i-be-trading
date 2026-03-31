# SIBT Product Rationalization Plan

## Product Promise
SIBT should feel like one connected system with one clear promise:

**Learn better trades. Make better trade decisions. Execute with more discipline.**

That breaks into three product layers:

1. **Learn**
Academy, glossary, simulator, badges, reminders.

2. **Decide**
Market regime, composite score, composite screener, ticker-level research.

3. **Execute**
Order review, broker handoff, trade checklist, journal, follow-up review.

Anything that does not clearly support one of those three jobs should be demoted, merged, or cut.

## Current State
The current app is already closer to the right shape than before:

- Primary nav is down to five routes in [App.tsx](/Users/Vivek/Development/should-i-be-trading/src/App.tsx): `/`, `/research`, `/signals`, `/trading`, `/learn`
- `/learn` has a structured academy flow
- `/research` has a strong composite/research surface, but still has many equal-weight tabs
- `/signals` still mixes decision support and practice utilities
- `/trading` still behaves like a toolbox more than a guided execution workflow
- `/` is still a market dashboard, not yet a true command center

The product risk now is not lack of capability. It is that users can still enter through too many surfaces and lose the intended flow.

## North Star UX
The ideal user journey should be:

1. **Understand** the setup
2. **Validate** the setup
3. **Practice** the setup if needed
4. **Review** the trade before execution
5. **Execute**
6. **Reflect** after the trade

SIBT should increasingly guide users through that sequence instead of presenting many parallel options.

## What To Double Down On
These are the highest-impact features and should stay prominent:

1. **Market regime dashboard**
This frames whether the user should be aggressive, selective, defensive, or inactive.

2. **Composite trade score**
This is the clearest product wedge for "Should I trade this now?"

3. **Composite screener**
This turns the score into discovery instead of just analysis.

4. **Order review**
This is where decision quality turns into execution quality.

5. **Academy + simulator handoff**
This is the strongest retention and trust feature for novice traders.

6. **Simple journal / trade review**
This reinforces disciplined behavior without requiring heavy analytics.

## What To De-Emphasize
These should not disappear, but they should stop competing equally with the core loop:

1. Deep tab sprawl inside Research and Signals
2. Standalone analysis surfaces that do not clearly lead to a next action
3. Broad asset-class expansion before equities/options workflows are excellent
4. Advanced broker/portfolio widgets that are not needed for the main beginner and active-trader flow
5. Redundant entry points into the same insight

## Keep / Merge / Hide / Cut

### Keep Prominent
- Dashboard market verdict
- Daily briefing
- Composite screener
- Composite verdict badge
- Order review
- Academy missions
- Simulator
- Watchlist
- Trade journal

### Merge
- Merge "AI Chat" and "Research" into one clearer "Ticker Research" workflow over time
- Merge backtest and simulator under a broader "Practice" model conceptually, even if routes stay separate at first
- Merge glossary and lesson-context definitions more tightly into Academy and Order Review
- Merge ticker-level social, fundamentals, earnings, and insider analysis behind one selected-symbol context

### Hide Deeper
- COT
- broad macro exploration
- 13F tracker
- advanced technical analysis
- less-used broker detail panels

These should remain available, but under `Advanced`, `More Research`, or context-driven drawers rather than first-line tabs.

### Cut Candidates
Do not cut immediately, but track actual usage and consider cutting if low-value:

- duplicate tab labels that only experts understand
- parallel research experiences that do not improve the trade decision
- features that are expensive to maintain and rarely used outside demos

## Recommended Navigation
The current top nav is already close. The target IA should become:

1. **Home**
2. **Learn**
3. **Research**
4. **Trade**
5. **Progress**
6. **Settings**

### Proposed Mapping
- `/` becomes **Home**
- `/learn` stays **Learn**
- `/research` stays **Research**
- `/trading` becomes **Trade**
- a new `/progress` route should own streaks, badges, lesson progress, journal summaries, and trade-review history
- `/signals` should stop acting like a peer destination long term

## What To Do With Signals
`/signals` currently contains:
- Regime
- Macro
- COT
- Backtest
- Simulator
- Activity

That is too broad for one peer-level destination.

### Recommended split
- Move **Regime** into `Home` and `Research` context
- Move **Simulator** into `Learn` and `Trade` handoffs
- Move **Backtest** into `Research` under advanced validation
- Move **Macro`, `COT`, and `Activity` into a secondary `Advanced Signals` section or drawer

### Near-term compromise
Keep `/signals`, but relabel its job internally as **Validation + Practice**, not as a standalone destination with equal priority.

## Command Center Home
The highest-ROI new surface is a real command center on `/`.

### Home should answer five questions immediately
1. What is the market regime right now?
2. What should I look at next?
3. What should I continue learning?
4. What trade workflow did I leave unfinished?
5. How am I doing on discipline?

### Proposed Home layout

#### Row 1: Market state
- Market verdict
- Daily briefing
- one-sentence stance: offensive / selective / defensive / wait

#### Row 2: Opportunity focus
- top 5 composite opportunities
- top watchlist movers
- one CTA: `Review Setup`

#### Row 3: Continue where you left off
- next academy lesson
- resume simulator
- pending order review
- most recent ticker being researched

#### Row 4: Progress
- streak
- badges
- weekly goal
- recent journal completion

### What Home should not be
- a dense dashboard of all market widgets
- a catch-all surface for every panel in the product

## Learn: Make It Mission-Based
The Academy should increasingly feel like missions rather than a content catalog.

### Good mission framing
- Mission 1: Understand calls and puts
- Mission 2: Practice covered calls
- Mission 3: Use the composite score on one ticker
- Mission 4: Review an order before execution

### Principles
- each mission should end with one action
- each mission should link into one actual SIBT workflow
- badges should reward completion, review quality, consistency, and simulator usage
- badges should not directly reward raw P&L, because that encourages bad behavior

### Badge framework direction
Badge progression should be based on:
- lessons completed
- simulator exercises completed
- order reviews completed
- journal entries completed
- streak consistency

Real-trade verification can unlock higher credibility tiers later, but promotion should require discipline and process quality, not just a profitable trade.

## Research: Reduce Parallel Paths
Research is strong but still visually broad.

### Recommended primary tabs
1. Composite
2. Ticker Research
3. Earnings
4. Insider
5. More Research

### Move into More Research
- News
- Social
- Technical
- 13F
- AI Screener side modes

### Ticker Research direction
Longer term, selecting a ticker should unify:
- fundamentals
- earnings
- insider
- social
- technical
- composite verdict

Instead of making the user decide which research mode to inspect first.

## Trade: Reduce Tool Feel
Trading should feel like a progression, not a utility shelf.

### Recommended primary trade stages
1. **Setup**
View the symbol, verdict, regime, thesis, and checklist.

2. **Review**
Run order review, see risks, spreads, position impact.

3. **Execute**
Broker handoff, account selection, order submission.

4. **Reflect**
Journal the trade, note what confirmed or invalidated it.

### What to demote
- import and broker admin details should not dominate the default page
- advanced strategy widgets should appear when the selected trade warrants them

## Progress: Add This Instead Of More Analytics
The next product surface should not be another analysis tab. It should be a lightweight Progress area.

### Progress should show
- streaks
- badges
- weekly learning goal
- lessons completed
- simulator reps completed
- trade reviews completed
- journal completion rate

### Progress should not become
- a bloated analytics dashboard
- a pseudo-PM performance tracker

Its purpose is habit reinforcement.

## Suggested Rollout Order

### Phase 1: IA and language cleanup
1. Rename internal product model to `Learn / Decide / Execute / Progress`
2. Reframe `/signals` as validation/practice in copy
3. Tighten Research tabs and demote lower-priority ones
4. Tighten Trading tabs and default state

### Phase 2: Command center
1. Rebuild `/` into a real Home
2. Add `continue where you left off`
3. Add top composite opportunities
4. Add progress snapshot

### Phase 3: Guided workflows
1. Build a selected-symbol workflow that connects research to trade review
2. Add consistent next-step cards on every major screen
3. Add a simple post-trade review flow

### Phase 4: Progress surface
1. Add `/progress`
2. Move badges, streaks, and summaries there
3. Keep Learn focused on missions, not account progress management

## Concrete Next Build
If only one major thing is built next, it should be:

**A new Home command center that connects market regime, top setups, academy continuation, and unfinished trade workflows.**

That is the shortest path to making SIBT feel simpler, more guided, and more habit-forming without adding product sprawl.

## Decision Filter For Future Features
Before shipping any new feature, ask:

1. Does this help the user learn, decide, execute, or reflect?
2. Does it reduce confusion or add another branch?
3. Does it connect to an existing workflow?
4. Would a beginner understand when to use it?
5. Is it more valuable than improving Home, composite, order review, or Academy?

If the answer is mostly no, it should not ship yet.
