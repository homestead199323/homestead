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
  - [x] **4z-5 (2026-09-30, commit 3c54f92): animals in real 3D, rolling terrain.**
    `src/features/grove/animals3d.js` (MARKER `GROVE_ANIMALS_3D`) replaces the camera-facing
    animal sprites with procedural geometry for all 14 species (cow, horse, donkey, alpaca, pig,
    goat, sheep, rabbit, chicken, duck, goose, turkey, quail, guinea fowl): body, neck, head,
    muzzle, eyes, ears, horns, legs with hooves, tail plus species details (udder, mane, wool,
    beard, comb, wattle, snood, fan tail, floppy ears, curly tail). Four coat variants per
    species (cow/goat patches by 3D noise, per-vertex colours). The whole herd is ONE merged
    mesh (one draw call + one shadow pass); motion lives in the vertex shader on the shared
    clock: each animal walks a slow loop inside its arena (paddock clear of shelter/trough/
    feeder, or the apron in front of a coop/barn), turning with its direction of travel, legs
    swinging in a trot, then stops to graze (neck down, nibbling) — hens strut and peck, tails
    swish, rabbits hop. Terrain: the ground is now a warped-grid mesh (dense near the farm,
    coarse far out) with rolling hills beyond a flat apron (`terrainHeightFn`), vertex-tinted
    drier on high ground, plus tree clumps and boulders out on the hills; the farm itself stays
    flat so every zone/road/fence is unchanged. Mobile pixel ratio capped at 1.5 (was 2).
    Verified in sandbox: ESLint, 61+3 tests, Vite build, Playwright harnesses (`tests/g3-all`,
    new `tests/g3-zoo` with every species) at 1280 and 390 px, zero console errors, walking
    loop + turning + leg swing seen across frames, draw calls unchanged at the home view (178).
    Live: index-Bv4YQo2A.js → Grove3D-CnrdgTkt.js (684,773 B; `g3animalDepth`, `g3pose`,
    `atan(tng.x, tng.y)` present; CSP header intact). NOT verified: real-device frame rate.
    Revert: `git revert 3c54f92` (flat SVG map untouched).
- [x] **Stage 5 — navigation regroup (built 2026-09-28, live 2026-09-30; commit b128c72, label
  follow-up 475fc64).** `src/app/navigation.js` now
  defines SECTIONS: Today (home "Overview" + tasks "All tasks"), My Space (map, crops, live),
  Plan (new `src/features/plan/PlanScreen.jsx`), Learn (manuals), Progress (new
  `src/features/progress/ProgressScreen.jsx` + pantry + fin). Page ids unchanged; saved pages map
  over (`normalizePage`: farm→map, season→plan). Phones: 5 bottom tabs (More removed), area pages
  as tabs on top (SectionBar) + account button (Settings, feedback, plan, Admin for the owner);
  tablets: icon rail + the same tabs; desktop: areas with their pages in the sidebar. Plan: waiting
  plantings with "I sowed it", this month's picks from suggest.js with the reason, "Coming up" by
  month, six-month season strip, the seasonal calendar (moved from Manuals). Progress: next
  harvest, food grown from pantry intake moves (kg, harvests, eggs, milk, ~portions at 80 g),
  harvest per month, pantry, money, badges; empty states say how numbers start appearing. Pure
  helpers `src/lib/plan.js`, `src/lib/progress.js`. No data changes, no deleted screens. Live check:
  see the UX follow-up entry below.
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
- [x] **UX follow-up: the audit's open items (built 2026-09-28, live 2026-09-30; commits 130338a,
  290737a, d8d256c, 5857e80, 3384d85, b128c72, fd1e149, 475fc64).** Import Backup confirms (backup vs current farm, download first,
  Undo; rejects non-backups); "+ Plant Crop" hidden until a bed exists ("+ Add a bed/planter");
  map buttons labelled (Growth / Reset / Expand, ≥44 px on touch); walk intro down to one choice
  (Options collapsed); Settings → Change password (current password first) and Delete account
  (type DELETE; new Edge Function `supabase/functions/delete-account`, deployed as v1 with
  verify_jwt on: cancels a live Basic/Pro Paddle subscription via `PADDLE_API_KEY` or refuses with
  409 so nobody is charged for a deleted account, then deletes farm row, profile row, auth user;
  privacy policy updated); Stage 5 navigation (above); landing on phones 14,746 → 13,197 px
  (plans swipe, Pro first; repeated stat tiles hidden; tighter spacing); leftover "Manuals" /
  "Seasonal" labels renamed (crop card link, assistant, feedback survey). Details and remaining
  items: `docs/UX_AUDIT_2026-09-28.md`. Verified: ESLint, 61+3 tests (5 new), build; Playwright at
  390/820/1440 px incl. dark mode, mocked-Supabase password change (wrong + right current password)
  and deletion (409 then 200: sign-in screen shows the deleted notice, local farm/session/entitlement
  caches empty); Edge Function paths run locally under Deno against a mock (trial, lifetime, no
  profile, canceled, live sub without key → 409, with key → cancel then delete, Paddle error → 409,
  bad/missing JWT → 401, no confirm → 400); live function answers CORS preflight and rejects
  unauthenticated calls. Pushed from the Mac after its build, 61+3 tests and ESLint passed there. Live
  2026-09-30: production deployment READY for 1432937; myterra-sigma.vercel.app and www.myterra.farm
  serve index-EkoHv9p5.js (+ Grove3D-COHP0spy.js) containing "Replace your farm with this backup?",
  "Delete my account", "Save new password", "Waiting to go in", "Food from your space", "Read the
  full guide in Learn", "Checking from indoors", "Show the whole map again" (Grove3D: "See how your
  plants grow over the coming weeks"); live `/` has "Swipe to compare Pro, Basic and Lifetime"; live
  `/privacy` has the in-app deletion wording; CSP header unchanged (Supabase host allowed for the
  function call). Live smoke test at 390 px with a simulated sign-in (every Supabase call answered
  by a mock, analytics blocked, no real account touched): five tabs Today / My Space / Plan / Learn /
  Progress, Plan and Progress render, Settings shows Change password and Delete account. Not
  verified: a real deletion on production; whether `PADDLE_API_KEY` is set.

- [x] **Website audit of landing v2 (2026-09-30, owner request; commits 1e05fd7, 4e768fc, 06701df,
  c6acfea).** Checked at 390/360/820/1440 px (links, assets, SEO/OG/structured data, robots/sitemap,
  keyboard, tour video, counts vs `src/data/`). Fixed: six app screenshots re-captured from the current
  app as `p2-*.webp` (five-tab menu, labelled map buttons; know-how card shows Plan "For you"); hero
  chips off the coop pop-up; final CTA small print centred; Basic "All 9 modules" → "Your 3D map, crops,
  animals and pantry"; tour poster picked in landing.js (phones: one poster, −127 KB); privacy policy
  no longer says "once paid plans launch"; branded `404.html`. App: coop pop-up rows fit 320–400 px,
  growth-preview pill on one line. Verified: ESLint, 61+3 tests, build (sandbox + Mac); deployment
  READY for c6acfea; www.myterra.farm and myterra-sigma.vercel.app serve landing.js?v=20260930, the
  six p2 images (200; old ones 404), `/some/missing-page` → 404 with the branded page, updated
  `/privacy`, app CSS index-C24mi1bD.css with the pop-up fixes; Playwright on the live site at the four
  widths: one poster request, small print centred, no horizontal overflow, tour plays. Stage 9 stays
  open: the Pro list still claims "Multi-zone management" and "Advanced analytics", which don't exist
  (owner decision, see audit doc). Deploy note: `/usr/bin/git` on the Mac now stops at the Xcode
  licence prompt; this push used `DEVELOPER_DIR=/Library/Developer/CommandLineTools` (no system
  change). Fix once on the Mac: `sudo xcodebuild -license accept` (also needed for the iOS build).

- [x] **Homepage v2 (2026-09-30, owner request: "redo the website with real screenshots and a 15-second
  video"; commits de98e16, 79e7c20).** New landing page: a live 3D-map hero loop (real app footage,
  vertical on phones), Balcony / Backyard / Farm tabs with map shots, a 15-second tour video recorded
  from the app (9:16 on phones, 16:9 elsewhere; MP4 + WebM; plays only while in view; pause button),
  how-it-works steps, know-how stats with four phone screens, features, pricing with a trial timeline
  (phones swipe the plans, Pro first), FAQ and a final call to action. 79e7c20 re-shot the tour video,
  the three space maps and the starter-map step for the five-tab menu and labelled map buttons (closes
  the audit's tour-video item), swapped the know-how Plan shot for the demo balcony, and moved "Watch
  real food pile up" to the Progress screen. New file names (`d2-*`, `p2-ob-map`, `p3-plan`,
  `og-image-v4.jpg`) so the service worker and link previews can't serve old images. Verified for
  79e7c20: ESLint and build (sandbox + Mac); production deployment READY; www.myterra.farm and
  myterra-sigma.vercel.app serve the new references (myterra.farm → 308 to www); the 14 new or changed
  files return 200 with the right type and byte size, the five replaced ones 404; CSP header identical
  to `vercel.json`; Playwright on the live site at 390 and 1440 px: no console errors, no broken
  images, both videos play, 6 sign-up links, no horizontal overflow, phones request only the vertical
  poster and videos. Not verified: playback in real iPhone Safari (the Chromium here has no H.264, so
  only the WebM path ran). Stage 9 stays open: the Pro list claims and the contact address (see the
  audit doc), plus the season-blind "food in ~N months" line, which still shows in the matched-plants
  shot and the tour video's set-up segment.

- [x] **Top-10 #1, #2, #4 from the competitor analysis (2026-09-30, owner request; commits b1d0e6f,
  0b7d423, b087a37).** #1 Weather alerts that know the plan: 7-day Open-Meteo forecast (daily + hourly
  humidity, 3 h cache, offline fallback); frost / heat / gale / heavy-rain / blight (Hutton criteria)
  jobs only for what is actually growing or kept; frost holds sowing and planting out of tender crops
  and turns "harvest in N days" into "Pick X before the frost"; rain today replaces outdoor watering with
  one note; Home "Next 7 days" strip (`lib/weather-alerts.js`, `data/frost.js`). #2 Reminders: web-push
  morning digest built from the real task engine for the next 7 mornings (`lib/digest.js`,
  `buildTaskPlan(data,{now})`), Settings → Reminders (hour, test, off) + one-time Home card (iPhone:
  Add to Home Screen first); Edge Function `push` (verify_jwt off, own auth: public-key / user-JWT test /
  cron secret), VAPID keys generated server-side into Vault, tables `push_subscriptions` +
  `push_digests` (RLS, cascade on account delete), pg_cron hourly `push-digest-hourly`
  (`supabase/migrations/2026093012*`). Email digest deferred (needs an email provider account).
  #4 Garden memory + Pro Insights: `data.memory` (harvests per planting/bed, bed history, eggs/milk/meat
  per species per month; optional field, no migration); Progress → Insights (Pro via
  `hasFeature('analytics')`, locked card otherwise; recording on every plan): crop and bed yields vs
  the per-planting estimate, kg/m², lay rate, cost per dozen / litre / kg from expenses tagged with the
  new Money "For" field, what grew where by year, CSV export (formula-safe); rotation warning in the
  planting form (RHS families, 3 years, `data/families.js`). Verified: ESLint, 73+3 tests (12 new),
  build (sandbox + Mac); Playwright at 390/1440 (weather strip + frost/gale/rain jobs with a mocked
  forecast; reminders enable/test/hour/off against a mocked Supabase; Insights, CSV download, Money
  "For"); push function live: public-key stable, unauthorised send/test → 401, cron → function 200,
  pipeline run with dummy endpoints on the owner's account (201 sent once and not re-sent, 410
  removed; rows deleted afterwards); web-push payload decrypted by an independent RFC 8291
  implementation. Live: both domains serve index-Bv4YQo2A.js with "Next 7 days",
  "save_push_subscription", "Insights are part of Pro", "For (optional)"; `/sw.js` has the push
  handlers. Not verified: a notification on a real phone; signed-in production screens. Stage 9 note:
  "Advanced analytics" on the Pro list is now real (Insights); "Multi-zone management" still isn't.

- [x] **Top-10 #6 and #7 (2026-09-30, owner request "continue with implementation"; commits 016cb0e,
  0705408).** #6 Your own jobs: `data.customTasks` (`lib/own-tasks.js`) — once / daily / weekly /
  every 2 weeks / monthly / every N days, optional map area, minutes, note, pause; due jobs join the
  queue as type `own` (map markers and walk when they have an area; push digest includes them);
  one-offs stay due with "N days late" until ticked, then `doneOn` keeps them closed; Tasks screen:
  "+ Add your own job" (ideas from the map), "Your own jobs" list, calendar/this-week, Done + Undo.
  #7 Time budget (`lib/time-budget.js`): the task engine run for the next 7 days × per-job minutes
  (harvests/late steps once, daily care and repeating own jobs each time) vs the onboarding answer
  (5 min/day = 35 min/wk, 15 = 105, weekends ≈ 3 h, 30–60 min/day ≈ 5¼ h); Tasks card (by day, where
  the time goes, one-tap "less often" trims for own jobs, tips, "Time you have" picker), Home line
  when over. Generated animal care and harvests are never dropped to fit. Verified: ESLint, 75+3
  tests (2 new), build (sandbox + Mac); Playwright at 390 px (add from an idea, trim applied and
  saved, over-budget line on Home, no console errors). Live: both domains serve index-BnJKVkTp.js
  with "Add your own job", "Where the time goes", "over your time". Not verified: signed-in
  production screens.
- [x] 2026-09-30 — Coop and barn split (045d068): new zone type `coop` (poultry + rabbits), `barn` is
  grazers + pigs, each falls back to the other; old poultry-named barn zones migrate to coop on load.
  3D map: both built as a building at the back + fenced run/yard in front inside the zone footprint,
  hollow walls with open doors, animals indoors and out (coop: raised house, pop door + ramp, nest
  boxes, roosts, mesh run, feeder, drinker, dust bath; barn: sliding door, stalls, trough, loft +
  ladder, yard with fence, trough, hay rack, lean-to, muck heap). Verified: ESLint clean, 3 tests,
  Mac build, Playwright harness screenshots (coop / barn / small barn + tiny coop, no console
  errors). Live: /app serves index-GnKsVh3a.js + Grove3D-D9vbAnZ_.js with "Chicken Coop", the
  migration regex and the g3y shader attribute. Not verified: signed-in production screens, flat
  designer map with a coop zone.

- [x] **Fixes after owner check (2026-09-30; commits 1bed2da, 1890453).** Weather: towns saved as
  "City, Country" (Farm city search) returned nothing from Open-Meteo's place search, so weather and
  warnings were silently missing (owner's farm had no town at all). Now the name is searched and the
  result in the named country picked (never another country); counties/provinces map to a town; all
  221 `data/cities.js` entries resolve (checked against the live API). Home shows a "Frost and storm
  warnings" town field when no town is set, and loading / not-found / offline states. Insights
  soundness (independent review, 11 findings): default amounts flagged `est` and kept out of
  "% of the estimate" and lay rate; crop-card Harvest asks the amount; `migrateMemory` backfills older
  pantry logs once (both load paths + backup) with move pairing — dry run on the owner's cloud data:
  48 September eggs (not 14 or 62), Cherry 62 kg + Cabbage 112.5 kg as pantry-log harvests; Done-today
  Undo reverses pantry + memory + planting; Animals-page collect ticks the day's job; lay rate over
  days covered, current year, birds kept now; unit costs running costs only (`capital` on animal
  purchases). Verified: ESLint, 79+3 tests, build (sandbox + Mac); Playwright: town picker → real
  Bristol forecast with a real blight alert, "Couldn't find" state. Live: both domains serve
  index-D7xnE6TC.js with "Frost and storm warnings", "How much did you pick?", "Running costs only".
  Not fixed (architecture): whole-document last-write-wins can drop one device's offline ticks.
