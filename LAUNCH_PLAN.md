# MyTerra Launch Plan (Public Launch Transformation)

**Source brief:** "MyTerra Public Launch Transformation Brief" (2026-07-14).
**Locked decisions (Dervis, 2026-07-14):**
- Pricing stays as shipped: Basic $4.99/mo, Pro $9.99/mo, Lifetime $190 (Paddle live). Brief's €6.99/€59.99 pricing is REJECTED.
- Trial: 7-day Pro trial → paywall. No permanent free plan.
- Staged rollout, one stage per Full-ship cycle. No "implement everything at once."

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Architecture assessment (Stage 1 — done 2026-07-14)

- React 19 + Vite 8. App.jsx = UI shell. Features in `src/features/`, data `src/data/`, logic `src/lib/`.
- Auth/sync: Supabase (Phase 5/6 FINAL). Cloud source of truth, localStorage cache `hfm_data_v7`.
- Payments: Phase 8 substantially shipped (Paddle checkout + webhook verified; domain approval pending).
- Existing onboarding: `src/features/onboarding/Onboarding.jsx` (409 lines, 4 steps:
  welcome → region+city → zone type → starter plants). Reusable as skeleton for the 12-step flow.
- Migrations: idempotent shape-fixers in `src/lib/migrations.js`, chained at TWO call sites in
  App.jsx (~L194 local load, ~L306 cloud pull). Any new field MUST be added at both.
- Map: single Farm-style environment (Grove engine + Living Farm Map in `src/features/farm/living/`).
  No Balcony/Backyard environments exist. This is the largest gap vs the brief.
- Nav: 7 sidebar items / 5 bottom tabs (`src/app/navigation.js`). Brief wants
  Today / My Space / Plan / Learn / Progress. Regroup = mapping exercise, no data change.
- Tasks: generated in `src/lib/` (buildTaskQueue). No per-task reason/duration/map-link schema yet.
- Analytics: Umami. Brief's event taxonomy not implemented.
- Gating: tier columns live in `profiles` (Supabase); in-app feature gating NOT built.

## Migration risks

1. `hfm_data_v7` key must NOT change. All new fields via idempotent migrations, defaults preserved.
2. Cloud pull path (App.jsx ~L306) rebuilds from `{...DEF, ...fresh}` — new DEF keys are safe,
   but nested objects need explicit migration (spread does not deep-merge).
3. Existing users must land as environment `farm` with their map untouched.
4. Sync last-write-wins: ship data-model changes BEFORE any UI that writes them, so an old
   client can't clobber new fields with `undefined` (old clients spread unknown keys through — verify).

## Stage plan

- [x] **Stage 1 — inspection + this plan** (2026-07-14)
- [~] **Stage 2 — data model.** Add `profile` block to DEF (environment, dimensions, sunlight,
  goals, experience, timeBudget, household, onboardingVersion) + `migrateProfile` at both
  call sites. Existing users → environment `farm`.
- [ ] **Stage 3 — onboarding.** Extend Onboarding.jsx to the brief's 12 steps (environment,
  dimensions, location, sunlight, goals, experience, time, household, assets, plant
  suggestions, initial map, 7-day plan). Every answer written to `profile` and consumed
  by suggestion/task logic. Finish on populated Today screen.
- [ ] **Stage 4 — map environments.** Balcony + Backyard visual environments on the shared
  data model; current map becomes Farm environment. Scale/objects/animations per brief §6–7.
  Multiple sessions. Lazy-load per-environment assets.
- [ ] **Stage 5 — navigation regroup.** NAV/BOTTOM_TABS/MORE_ITEMS → Today, My Space, Plan,
  Learn, Progress. Screen mapping: Today=TodayScreen; My Space=Farm+Crops+Animals;
  Plan=SeasonalCalendar+suggestions; Learn=Manuals; Progress=Pantry+Financials+badges.
  No data changes, no deleted screens.
- [ ] **Stage 6 — task engine upgrade.** Task schema: reason, duration, map ref, priority,
  postpone/skip/not-relevant responses feeding future scheduling. Environment-aware
  frequency (container vs bed).
- [ ] **Stage 7 — trial + gating.** 7-day Pro trial from account creation, expiry →
  read-only + paywall (data preserved), 72h offline grace token. Uses existing Paddle
  tiers. Basic zone-cap decision still open (blocker for this stage).
- [ ] **Stage 8 — sharing + referral attribution.** Share cards from map; referral data
  model + attribution events first, rewards later.
- [ ] **Stage 9 — homepage.** 3-environment hero, new copy ("Grow food without the
  guesswork"), remove unsubstantiated claims. Pricing section keeps $4.99/$9.99/$190.
- [ ] **Stage 10 — verification.** Lint, build, migration tests, onboarding e2e, offline,
  trial expiry, mobile map editing, accessibility (remove user-scalable=no etc).

**Scope freeze:** per brief §19 — no new crops/animals/guides/modules until Stages 2–10 done.
