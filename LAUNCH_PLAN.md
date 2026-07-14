# MyTerra Launch Plan (Public Launch Transformation)

**Source brief:** `docs/LAUNCH_BRIEF.md` (full canonical text — read it before working on any stage).
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
- [x] **Stage 2 — data model** (2026-07-14, commit c695356). Add `profile` block to DEF (environment, dimensions, sunlight,
  goals, experience, timeBudget, household, onboardingVersion) + `migrateProfile` at both
  call sites. Existing users → environment `farm`.
- [x] **Stage 3 — onboarding** (2026-07-14). 12-step flow shipped (environment,
  dimensions, location, sunlight, goals, experience, time, household, assets, plant
  suggestions, initial map, 7-day plan). All answers → `profile` (onboardingVersion 2);
  suggestions consume environment/sunlight/experience/dislikes via `src/lib/suggest.js`
  (reusable for Plan screen + Stage 6). Starter zone + canvas generated per environment
  (`buildStarterZone`); assets stored in `profile.assets` but do NOT auto-create zones
  (Basic zone-cap decision pending). Legacy skip loop bug fixed (skip now sets
  setupDone:true). Finish lands on populated Today via existing buildTaskQueue.
- [~] **Stage 4 — map environments.** Balcony + Backyard visual environments on the shared
  data model; current map becomes Farm environment. Scale/objects/animations per brief §6–7.
  Multiple sessions. Lazy-load per-environment assets.
  - [x] **4a (2026-07-14):** environment plumbing + first visual pass. `src/lib/environment.js`
    (resolveEnvironment, farm fallback). GroveScene + LivingFarmMap render per environment:
    balcony = decking ground, apartment wall + railing frame, no border trees/roads/gate/tufts;
    backyard = lawn + perimeter fence, no farm gate/roads/border trees; farm unchanged.
    Fixed Stage 3 regression: zone types `raised`/`container` registered in ZT (onboarding wrote
    unregistered `contain`/`raised` — balcony/backyard users couldn't plant into starter zones);
    `contain`→`container` normalized in migrateZones; all 5 plant-zone lists extended; new
    raised/container surfaces in visuals.js; migrateProfile added to backup-import path.
    Map animations pause when tab hidden (§17). jsdom e2e: 3 envs + legacy user + migration.
  - [ ] **4b:** richer per-env animations (wind sway, rain, watering), sun-direction overlay,
    balcony vertical structures/hanging planters, backyard trees/shed/seating objects.
  - [ ] **4c:** environment switcher in settings (brief §18 — existing users may change env),
    lazy-loaded image assets when/if they replace CSS/SVG surfaces.
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
