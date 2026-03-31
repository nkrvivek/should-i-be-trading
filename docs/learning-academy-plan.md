# SIBT Learning Academy Plan

## Goal

Make SIBT useful for novice traders without forcing them straight into live risk.

The free tier should include:

- structured trading lessons
- simulator-first strategy walkthroughs
- glossary and deep dives
- streak tracking
- reminder preferences
- badge paths across major product/market categories

## Core Principles

1. Teach process, not hype.
2. Start in simulation before live execution.
3. Never reward reckless behavior with progression.
4. Use live-trade reviews for reflection, not P&L-based status.

## Curriculum Scope

Tracks:

- Options Basics
- Income and Protection Strategies
- Spreads and Order Entry
- How To Use SIBT Well
- Forex and Futures Basics

Topics explicitly covered:

- calls and puts
- covered calls
- cash-secured puts
- protective puts and collars
- buy to open / sell to close / sell to open / buy to close
- defined vs undefined risk
- spreads and broker ticket entry
- ETFs
- stock-screening workflow inside SIBT
- forex basics
- futures and commodities basics

## Badge System

Badge markets:

- stocks
- options
- ETFs
- futures
- forex
- commodities

Levels:

- beginner
- intermediate
- expert

Progression model:

- complete lessons
- complete simulator checkpoints
- log at least one live trade review when the path calls for it
- review whether the trade followed plan

Do not require profitable trades to level up.

Reason:

- outcome-based progression incentivizes bad risk-taking
- it teaches luck instead of process
- it is a poor fit for a genuine education product

Track returns separately if desired, but do not use them as the unlock mechanic.

## Reminder System

### Phase 1

- browser reminder preferences in the free tier
- daily or weekly cadence
- weekly session goal
- streak tracking in local state

### Phase 2

- backend email nudges
- daily streak reminder email
- weekly recap email
- "continue your lesson" deep links

Backend pieces needed for Phase 2:

- persisted reminder preferences per user
- scheduled job / cron edge function
- email template(s)
- unsubscribe and quiet-hour behavior

## Product Surfaces To Update

- `/learn`
- landing page
- pricing page
- features page
- settings / plan surfaces
- any glossary-oriented free-tier messaging

## Safety / Compliance

- keep education language separate from trade recommendations
- keep simulator-first flow for novice content
- avoid gamifying profits
- avoid encouraging oversized or leveraged trades for progression
- clearly mark futures / forex / short premium as higher-risk learning paths

## QA Checklist

- build passes
- lint passes or only known warnings remain
- unit tests for curriculum and streak logic
- public page smoke test for `/learn`
- verify free-tier copy across landing, pricing, tier manager, features
- verify no new secrets or API-key dependencies were introduced
