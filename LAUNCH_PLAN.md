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
- [x] **Stage 4 — map environments.** (completed 2026-07-14) Balcony + Backyard visual environments on the shared
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
  - [x] **4b (2026-07-14, commit 827db47):** per-env map FX. New `src/features/grove/MapFX.jsx`
    (shared by GroveScene + LivingFarmMap): live rain/snow from cached Open-Meteo forecast,
    sun-direction glow from `profile.sunDirection` (morning/afternoon/allday) with ☀️ badge;
    balcony railing planters + wall shelf, backyard trees, env-aware decor palette, watering
    drips. Hidden in edit mode (§7). Verified live in bundle index-BRWIEMGE.js
    (grove-rain-drop, grove-snow-flake, data-map-fx, "Morning sun"/"Sun all day" all present).
  - [x] **4c (2026-07-14, commit 29329a6):** environment switcher in Settings (brief §18 —
    existing users may change env). SettingsPanel "My Space" section writes
    `profile.environment` ONLY — zones, plots, canvas, dimensions untouched, no layout
    regeneration. Farm designer size editing made env-aware: label "Total space size"
    for balcony/backyard, MeterField min 2 m (balcony) / 4 m (backyard) — old 10 m floor
    locked balcony users out of editing real-space dimensions. Lazy-loaded image assets:
    N/A — all env surfaces are CSS/SVG. Vercel webhook missed 29329a6; retriggered via
    05c72e6. Verified live in bundle index-Br4oa1nD.js ("Total space size", switcher
    helper text, "My Space" all present; CSP header intact).
  - [x] **4z (2026-09-27, commit 96bff87): real 3D farm map.** `src/features/grove/Grove3D.jsx`
    renders the map with three.js (lazy chunk Grove3D-*.js, ~170 kB gz): one camera, one sun,
    shadows; every zone type built from geometry (buildings with roofs/windows/doors/solar,
    framed glass greenhouse, beds with dense instanced crop rows, water reserve, compost,
    hives, nursery, pasture shelter), perimeter hedge, curved kerbed paths, trees/rocks/flowers.
    GroveScene uses it when `mapStyle.camera` is "3d" (default); edit mode, walk focus and
    missing WebGL fall back to the flat SVG. Designer option "View: 3D / Flat overhead" under
    Ground & paths. Labels match the field-sign style, colliding names hidden. Verified: ESLint,
    46+3 tests, Vite build; live bundle index-CNRP_iZ_.js references Grove3D-DKLJOoeW.js
    (649,674 B; "g3-pill", "prop-bush", "RoomEnvironment" present); zone-card click works in 3D.
    NOT yet verified on a phone (frame rate while dragging ~1,300–1,600 meshes). Revert = set
    View to "Flat overhead" per farm, or `git revert 96bff87`.
  - [x] **4z-2 (2026-09-27, commit 99781e1): map-game controls + performance pass.** Custom
    FarmControls: drag pans with inertia, pinch/twist/two-finger tilt anchored between the
    fingers, wheel zooms to cursor, tap opens, double-tap zooms, keys pan/zoom; view clamped to
    the farm. Inline map is cooperative (one finger scrolls the page + hint, two fingers move
    the map, Ctrl/Cmd+wheel zooms); full-screen mode with zoom/reset/close buttons. Static
    meshes merged per material (≈1,500 → ≈110 meshes; ≈360 draw calls/frame), shadows rendered
    once, render on change only, lower resolution during gestures, world rebuilt only when map
    data changes, taps via one hit box per area. Quality: polygon-offset ground layers (no
    z-fighting), fog tied to fit distance, top-view crop planes, selection outline, labels
    under an area's front edge with size-based decluttering. Verified: 30 synthetic gesture
    checks (Playwright, inline + full screen), ESLint, 46+3 tests, build; live bundle
    index-m0JK4sjp.js → Grove3D-C955PL0-.js ("g3-coop", "Use two fingers to move the map",
    "Full screen map" present; CSS "g3-ctl"). Real-device frame rate still unmeasured.
  - [x] **4z-3 (2026-09-27, commit 4b58929): growth made visible.** Row markers with
    stage-coloured tags on every planted row (Planned/Sown/Seedling/Growing/Maturing/Harvest
    window), gold halo on rows in their harvest window, sprouts for sown rows, stage dots under
    area names, mouse tooltips per row (crop, stage, days to harvest, count), growth-preview
    panel (chips + 0–120-day slider, legend with counts; badges hidden while previewing).
    Layout fix after the "menu disappeared" report: inline map height capped at 78% of the
    window, controls moved to the map's top-right, body scroll always restored. Verified:
    ESLint, 46+3 tests, build, 30 gesture checks, app screenshots at 1440/900/390 px with the
    nav visible; live bundle index-wB2IpMT0.js → Grove3D-BB0FU84v.js ("Growth preview and
    legend", "in its harvest window", "+2 wk" present; CSS g3-time/g3-tip). Still open:
    real-device frame rate; exact cause of the reported missing menu not reproduced.
  - [x] **4z-4 (2026-09-27, commit 0051b67): rendering quality, animations, efficiency.**
    Quality: crossed crop sprites and tree leaf discs fade by view angle (ordered dither) so
    beds seen from above show clean top-view art and trees seen low keep a solid three-sphere
    crown; edge-on planes dropped (no dark stem lines); animals/props lean back toward a high
    camera; lower afternoon sun for readable shadows. Animations, all in the vertex shader from
    one clock (loop only while the map is on screen and the tab visible; 30 fps idle desktop /
    20 phone, full rate during gestures; reduced-motion honoured): crop/tuft/canopy sway, water
    drift, harvest-halo pulse, bee hover, hen hop, chimney smoke, drifting cloud shadows.
    Efficiency: home view 380 → 168 draw calls (transparent double-sided materials no longer
    drawn twice; camera-facing sprites instanced per artwork; fences/tufts/pots/markers/crops
    collected farm-wide; crossed quads merged; per-call materials memoised). Design (user
    reports): labels sit on the thing they name (footprint centre at roof/bed height) so
    numbered narrow beds read unambiguously, compact pills/badges, shrink when zoomed out;
    bed-detail stage key shows the bed's own crops (one row per crop). Verified: ESLint,
    46+3 tests, build, 30/30 gesture checks, all-zone-type + numbered-beds harnesses, app
    screenshots 1440/390 with nav; live index-B-YJRLUB.js → Grove3D-B770U796.js (g3bayer,
    proc:puff, g3size, uFadeV, forceSinglePass, IntersectionObserver present; CSS g3-far,
    q-stage-key-crop, pill/badge min-height:0). Not verified: real-device frame rate and
    battery; animation timing only reasoned about (headless RAF is starved).
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

- [x] **Scope-freeze exception (2026-09-28, owner request, commit 99e7683): cheese + prosciutto
  recipes in Manuals → Preserving.** `src/data/recipes.js`: 8 cheeses (ricotta, paneer, labneh,
  mascarpone, chèvre, 30-minute mozzarella, halloumi, feta) + 3 prosciutto-style cures (duck
  prosciutto, lonzino, whole-leg prosciutto crudo), each with safety, ingredients, numbered
  steps, storage/shelf life, troubleshooting, sources; linked to their parent methods, own
  filter chips. `cheese_making`: rennet dose corrected (¼ tsp per 4 L, was per 10 L) + raw-milk
  pasteurisation line. Detail header labels wrap on phones. Facts checked by an independent
  review pass (Parma spec 2025, Santé publique France, USDA/FSIS, FDA, NHS, CDC, Oregon State /
  NMSU / UAF / UCCE extension, Guelph). Verified: ESLint, 46+3 tests, build (sandbox + Mac), all
  24 Preserving pages open at 360 px with no errors or horizontal overflow; live bundle
  index-BZAVYMD4.js on myterra-sigma.vercel.app and www.myterra.farm contains "Cured Meat
  Recipes", "RAW MILK FROM YOUR OWN ANIMALS", "READY WHEN BOTH ARE TRUE". Not verified: the live
  screen itself (behind sign-in). Open: `oil_preservation` says "Dried herbs in oil: 2–3 weeks";
  Oregon State Extension says dried herbs/garlic in oil must be used within 4 days.
- [x] **Scope-freeze exception #2 (2026-09-28, owner request, commit bd9a3a5 — its commit message
  was mistakenly a copy of 99e7683's; this entry is the correct description): Balkan, Turkish and
  Mediterranean recipes.** Cheeses: kajmak, gjizë/urdë/lor (+ çökelek), burrata, kashkaval/kaşar
  (aged), Balkan white cheese (djathë i bardhë / sirene / beyaz peynir). Cured meats: pastırma,
  bresaola, pancetta + guanciale, sucuk/suxhuk (fermented; always cooked; pH ≤5.3 within 72 h at
  22–24°C). Cooked meats (new "Cooked Meat Recipes" filter): prosciutto cotto, kavurma. Origin
  shown on every recipe; Balkan pršut note on the whole-leg recipe; step labels with Turkish
  capitals render bold. Independent fact-check pass applied (CFIA/BCCDC degree-hours, 9 CFR
  424.21, FSIS cooling, foodsafety.gov, Kayseri GI, Bresaola IGP, Dalmatinski pršut PGI, NHS).
  Verified: ESLint, build and tests (sandbox 46+3, Mac 56+3 on top of 85c9f6e), all 35 Preserving
  pages open at 360 px with no errors/overflow. Total recipes: 22.
- [x] **UX pass (2026-09-28, owner request "full UX/UI testing", commit 096dfa5).** Walkthrough
  as the target user (backyard + balcony beginners, skip-setup, established farm; phone 390/360,
  tablet, desktop 1440, dark mode, trial day 1 / last day / expired) → findings in
  `docs/UX_AUDIT_2026-09-28.md` (24, severity-ranked, with open items). Shipped: sign-up funnel
  (landing CTAs → `/app?signup`, Create account / Sign in tabs, forgot password + PASSWORD_RECOVERY
  "choose a new password", landing.js forwards auth hashes to /app, sign-up no longer hangs on
  "Please wait…" when email confirmation is on, Enter submits); real plan label instead of the
  hard-coded "Free plan"; trial banner shows the end date. Onboarding honesty: "now" = sowing window
  open or opening within ~2 weeks, off-season picks become "Sow from <month>" plans; picks wait as
  "Ready to sow" and the sow job stays until done, which starts the growing clock that day
  (`src/lib/sowing.js`); starter bed sized by time budget, 1.2 m wide, rows laid out with
  planPlanting; starter-kit shopping list (plan step + Home checklist); live 3D preview on the map
  step. Tasks: calm "Do today", ~minutes per job, done toast with next step + Undo, Tasks-screen
  completions stock eggs/milk like the map popup. Also: full-screen map hides tab bar + assistant,
  nothing renders under onboarding, crop card (human dates, "I sowed it today", delete confirm),
  currency from device locale + Settings, space-name setting shows on Home, US-timezone
  harvest-day fix. New optional data fields (no migration): `plot.sowPending`, `plot.sowFrom`,
  `data.starterKit`, `data.currency`. Verified: ESLint, 56+3 tests (10 new), build (sandbox + Mac),
  Playwright walkthroughs before/after incl. mocked-Supabase sign-up, wrong password, reset request
  and recovery link; live index-DSA2_H-R.js (+ Grove3D-D4Br-Orz.js) contains "Start your 7-day free
  trial", "Choose a new password", "I sowed it today", "Your starter kit", "myterra:toast",
  "g3-full-open"; live `/` has 6 `/app?signup` links; CSP header unchanged. Not verified: real
  email delivery (Supabase SMTP) and the auth redirect allow-list (see audit doc), real-device
  frame rate of the onboarding 3D preview. Revert: `git revert 096dfa5`.
