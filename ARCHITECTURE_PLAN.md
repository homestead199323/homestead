# MyTerra Architecture Plan

**Goal:** prepare MyTerra for web, iOS, and Android without rebuilding the app from zero.

This is the living checklist for architecture work. When a task is finished, change `[ ]` to `[x]` and add a short note if needed.

**Last updated:** 2026-05-11 — Phase 3.9 (NAV config extraction) complete. App.jsx down to 529 lines. Navigation config (NAV, BOTTOM_TABS, MORE_ITEMS) now lives in `src/app/navigation.js`.

---

## North Star

MyTerra should become:

> One shared farming brain powering the web app, the iOS app, and the Android app.

That means crop rules, animal rules, task rules, pantry logic, financial logic, and offline sync should live in shared code. The web, iPhone, and Android versions should use the same brain, not three separate copies.

---

## Simple Picture

```text
                         MyTerra Shared Brain
              crops, animals, tasks, seasons, pantry,
              financials, storage, sync, user farm data

                    /             |             \
                   /              |              \
              Web App        iOS App        Android App
             browser UI     phone shell     phone shell
```

The app should work first on the device, then sync to the cloud when internet is available.

```text
User action
   ↓
Save immediately on this device
   ↓
App keeps working offline
   ↓
When internet returns, sync with cloud
   ↓
Other devices update
```

---

## Actual Current Folder Structure (as of 2026-05-11)

This is what exists on disk right now, not the target.

```text
src/
  App.jsx                  ← 529 lines — UI + state + routing only
  main.jsx
  index.css

  app/                     ← Phase 3.9 (commit c09ba81) — navigation config
    navigation.js          ← NAV, BOTTOM_TABS, MORE_ITEMS + their lucide icons

  features/                ← screen components extracted from App.jsx
    pantry/
      Pantry.jsx           ← Phase 3.1 (commit 4a17087)
    financials/
      Financials.jsx       ← Phase 3.2 (commit c42a1aa)
    manuals/
      Manuals.jsx          ← Phase 3.3 (commit 33a7a14) — also contains
                             Preserving, SeasonalCalendar, Blueprint, Projects
    animals/
      Livestock.jsx        ← Phase 3.4 (commit 930e9d0)
      AnimalOverlay.jsx    ← Phase 3.4 (commit 930e9d0) — shared popup,
                             imported by TaskQueue + TodayScreen
    tasks/
      TaskQueue.jsx        ← Phase 3.5 (commit 49011b3) — TaskRow + TaskQueue
    farm/
      Farm.jsx             ← Phase 3.6 (commit fb8d6e3) — Setup + Farming +
                             FarmMapHero + FarmTab (FarmTab default-exported)
      PlotOverlay.jsx      ← Phase 3.5 (commit 49011b3) — shared popup,
                             imported by Farm + TodayScreen + TaskQueue
    today/
      TodayScreen.jsx      ← Phase 3.7 (commit 5425623) — Dashboard / Today screen
    assistant/
      AIAssistant.jsx      ← Phase 3.8 (commit 29cf39d) — floating chat +
                             autocomplete dropdown + quick-prompt rail

  components/
    ui.jsx                 ← Btn, Card, Inp, Sel, Txt, Overlay, Pill,
                             Tooltip, Ring, Stat, StepChecklist,
                             WaterCard, StorageCard (13 components)

  data/                    ← pure data constants, no logic
    crops.js               ← CROPS, CROP_MAP, CROP_COLORS (70 crops)
    zones.js               ← ZT, ZT_MAP
    regions.js             ← REGIONS, REGION_MAP
    regional-overrides.js  ← RO (crop overrides), LDB_RO (livestock overrides)
    varieties.js           ← VARIETIES, VAR_RO
    companions.js          ← COMP
    breeds.js              ← BREEDS
    livestock.js           ← LDB, POULTRY_SPECIES, HOOFED_SPECIES,
                             GRAZER_SPECIES, animalPlural (14 animals)
    livestock-calendar.js  ← LIVESTOCK_CALENDAR (14 animals × 12 months)
    preservation.js        ← PRESERVATION (13 methods)
    badges.js              ← BADGES
    projects.js            ← PROJECT_GUIDES, BLUEPRINT_IMAGES
    cities.js              ← CITY_DB, searchCity

  lib/                     ← logic/helpers, no UI
    storage.js             ← DB, uid (localStorage wrapper)
    theme.js               ← C (colors), F (fonts), SX (style helpers)
    utils.js               ← appendLog, toLocalDateKey, todayLocalKey,
                             localDateFromKey, addDaysToLocalKey,
                             daysBetweenLocalKeys, markTaskDone
    regional.js            ← getRegionalCrop, getRegionalCrops,
                             getRegionalCropMap, rCM, rCR,
                             getRegionalVarieties, getRegionalCalendar
    farm-calc.js           ← cropMeasureType, plantsFromArea, expectedYield,
                             zoneAreaM2, plotAreaM2, zoneSpaceStats,
                             buildZoneSpaceMap
    task-queue.js          ← buildTaskQueue (crop tasks, animal tasks,
                             species grouping, sorting)
    calendar.js            ← MN_FULL, MN_ABR, parseSowMonths,
                             parseHarvestMonths, CROP_DIFFICULTY,
                             getCropDifficulty
    migrations.js          ← migrateZones, migrateGamify,
                             migrateCompletions, updateGamify
    ai.js                  ← farmKnowledgeEngine, buildAISuggestions
                             (offline assistant, no API key)
```

What App.jsx still contains (not yet extracted):
- `DEF` — default state object
- `dataReducer` — state reducer
- `ErrorBoundary` class component
- All remaining screen components: BottomNav, MoreDrawer, AppInner, App, FeedbackSurvey, FeedbackPrompt *(Pantry, Financials, Manuals + sub-screens, Livestock + AnimalOverlay, TaskQueue + TaskRow, PlotOverlay, Setup + Farming + FarmMapHero + FarmTab, TodayScreen, AIAssistant all extracted to `src/features/`; NAV/BOTTOM_TABS/MORE_ITEMS extracted to `src/app/navigation.js`)*

---

## Commit History (all meaningful commits to date)

### Phase A — Data Extraction (Jan–May 2026)

| Commit | Message | App.jsx lines |
|--------|---------|---------------|
| `303a93c` | Phase A.1: extract DB, uid + C, F, SX into src/lib/ | – |
| `b302ad0` | Phase A.2: extract ZT, COMP, BREEDS to src/data/ | – |
| `f267e10` | Phase A.3: extract VARIETIES, CROPS, REGIONS to src/data/ | – |
| `58cdf57` | Phase A.4: extract RO + LDB_RO to src/data/regional-overrides.js | 5950 → 5546 |
| `ce2455c` | Phase A.5a: extract livestock data + LIVESTOCK_CALENDAR | 5785 → 5544 |
| `5f64804` | Phase A.5b: extract PRESERVATION, BADGES, PROJECT_GUIDES, BLUEPRINT_IMAGES | 5544 → 5218 |
| `51ad979` | Phase A.7: extract utils, cities, regional, farm-calc | 5218 → 4878 |
| `4369a91` | Phase A.8: extract UI primitives + buildTaskQueue | 4878 → 4601 |
| `d049add` | Phase A.9: extract calendar helpers + migrations | 4601 → 4485 |
| `10038c8` | Phase A.10: extract farmKnowledgeEngine + buildAISuggestions into lib/ai.js | 4485 → 4031 |

### UI/UX Design Phases (DESIGN_PLAN.md)

| Commit | Message |
|--------|---------|
| `d9fc48f` | Phase 1.1–1.3: design tokens, refined palette, type scale |
| `69c2e98` | Phase 1.4: component audit — fix stray inline buttons |
| `0147277` | Phase 2.2: responsive nav — bottom tabs / icon rail / full sidebar |
| `c2a448a` | Phase 2.3+2.4+2.6: stack grids, bottom-sheet Overlay, 44px touch targets |
| `d467218` | Phase 3.1-3.2: Lucide React icons — nav, bottom tabs, controls |
| `9b1c23f` | Phase 3.4: Lucide icon swap — Leaf for brand/FAB, Trash2 for delete |
| `f867ee9` | Phase 3.5: pill/badge consolidation — 14 inline spans replaced |
| `4816ca8` | Phase 4: IA rethink — Today tab, merged Farm tab, calm greeting, profile avatar |

### Phase 4 — Storage Layer (May 2026)

| Commit | Message |
|--------|---------|
| `701adc6` | Docs: update ARCHITECTURE_PLAN to reflect Phase A completion |
| `3815979` | Phase 4: storage layer — clean API + UI pref helpers, zero raw localStorage in App.jsx |
| `0431ca4` | Docs: ARCHITECTURE_PLAN — mark Phase 4 done, add commit row, append decision-log entries |
| *(this commit)* | Phase 4 close-out: delete unused DB shim + mark Phases 0/1/2/4 FINAL |

### Phase 3 — Screen Extraction (May 2026)

| Commit | Message | App.jsx lines |
|--------|---------|---------------|
| `667c78b` | Docs: ARCHITECTURE_PLAN — Phase 3 starts (overrides defer note), lock Phase 5 inputs in decision log | – |
| `4a17087` | Phase 3.1: extract Pantry into src/features/pantry/ | 4037 → 3952 |
| `c42a1aa` | Phase 3.2: extract Financials into src/features/financials/ | 3952 → 3876 |
| `33a7a14` | Phase 3.3: extract Manuals (+ Preserving/SeasonalCalendar/Blueprint/Projects) | 3876 → 3348 |
| `930e9d0` | Phase 3.4: extract Livestock + AnimalOverlay into src/features/animals/ | 3348 → 3189 |
| `49011b3` | Phase 3.5: extract Tasks (TaskQueue + TaskRow) + PlotOverlay into src/features/{tasks,farm}/ | 3189 → 2380 |
| `fb8d6e3` | Phase 3.6: extract Farm (Setup + Farming + FarmMapHero + FarmTab) into src/features/farm/Farm.jsx | 2380 → 1378 |
| `9dbd2b5` | Cleanup: remove 4 orphan comment headers in App.jsx (BADGE DEFINITIONS, TASK QUEUE ENGINE, FarmMap removed, WEATHER DASHBOARD CARD) | 1378 → 1359 |
| `5425623` | Phase 3.7: extract TodayScreen into src/features/today/TodayScreen.jsx | 1359 → 788 |
| `f359230` | fix: restore Seasonal nav button (export SeasonalCalendar from Manuals.jsx) | 788 |
| `ff60873` | cleanup: drop 47 unused imports from App.jsx | 775 |
| `29cf39d` | Phase 3.8: extract AIAssistant into src/features/assistant/AIAssistant.jsx | 775 → 558 |
| `c09ba81` | Phase 3.9: extract NAV/BOTTOM_TABS/MORE_ITEMS into src/app/navigation.js | 558 → 529 |

### Infrastructure / Fixes

| Commit | Message |
|--------|---------|
| `ef5b45a` | CSP: extract inline scripts to external files |
| `34e60b8` | Refactor: local date helpers + fix react-hooks deps + dead code removal |
| `b5cfb12` | Fix: rename lucide Map import to MapIcon (crash fix) |
| `befd4da` | Fix: restore getRegionalCalendar lost during Phase A extraction |
| `b8e887c` | Fix: add missing getRegionalVarieties function |
| `730c627` | Feat: dark mode toggle — persists to localStorage, respects system pref |
| `e13c41a` | Docs: add ARCHITECTURE_PLAN.md |

---

## Target Folder Structure (what we're moving toward)

```text
src/
  app/
    App.jsx
    navigation.js    ← NAV, BOTTOM_TABS, MORE_ITEMS (currently in App.jsx)
    state.js         ← DEF, dataReducer (currently in App.jsx)
    migrations.js    ← already exists at src/lib/migrations.js

  core/              ← NOT STARTED — farming brain
    crops/
    animals/
    tasks/
    calendar/
    yields/
    pantry/
    financials/

  data/              ← ✅ DONE — all pure data constants extracted
    (see actual structure above)

  services/          ← NOT STARTED
    storage/         ← src/lib/storage.js exists but is minimal
    auth/
    sync/
    database/
    payments/
    weather/
    notifications/

  features/          ← PARTIAL — 8 of ~9 screens extracted
    today/           ← ✅ DONE (Phase 3.7)
    farm/            ← ✅ DONE (Phase 3.6)
    tasks/           ← ✅ DONE (Phase 3.5)
    animals/         ← ✅ DONE (Phase 3.4)
    pantry/          ← ✅ DONE (Phase 3.1)
    financials/      ← ✅ DONE (Phase 3.2)
    manuals/         ← ✅ DONE (Phase 3.3)
    assistant/       ← ✅ DONE (Phase 3.8)

  components/        ← PARTIAL — all in one file (ui.jsx) not split per component
    ui.jsx           ← exists, contains all 13 components
    (target: Button.jsx, Card.jsx, Overlay.jsx, Pill.jsx, etc.)

  lib/               ← ✅ DONE — all shared logic extracted
    (see actual structure above)

  platform/          ← NOT STARTED
    web/
    mobile/
```

---

## Phase 0 — Protect The Working App

**Status: FINAL (2026-05-09)** — discipline maintained throughout Phase A and Phase 4. Production verified live and smoke-tested by Dervis.

- [x] Confirm `npm run build` passes before each architecture change.
- [x] Confirm the app opens locally after each architecture change. *(2026-05-09: live app at https://myterra-sigma.vercel.app/app smoke-tested post-Phase-4)*
- [x] Avoid changing product behavior during pure architecture cleanup.
- [x] Keep each change small enough to understand and undo.
- [x] Do not start mobile packaging until the shared app brain is separated from screen code. *(constraint satisfied — `src/lib/` brain and `src/data/` constants are already separated from screens; Capacitor remains independently deferred to Phase 7)*

---

## Phase 1 — Split The Reusable UI Pieces

**Status: FINAL (2026-05-09)** — All 7 required components extracted into `src/components/ui.jsx`, plus 6 bonus components (Tooltip, Ring, Stat, StepChecklist, WaterCard, StorageCard). Single-file structure deliberately retained — splitting 13 components into 13 files would add boilerplate (shared theme imports) without functional benefit at this scale (10 KB total).

- [x] Create `src/components/`.
- [x] Move `Btn` into components. *(in ui.jsx, not Button.jsx)*
- [x] Move `Card` into components. *(in ui.jsx)*
- [x] Move `Overlay` into components. *(in ui.jsx)*
- [x] Move `Pill` into components. *(in ui.jsx)*
- [x] Move form fields `Inp`, `Sel`, `Txt` into components. *(in ui.jsx)*
- [x] Replace imports in `App.jsx`.
- [x] Run `npm run build`.
- [x] Open the app and check Today, Farm, Animals, Pantry, Financials, and Assistant.
- [ ] *(optional, deliberately not done)* Split ui.jsx into individual component files. *Splitting 13 components into 13 files would add 13 identical theme-import blocks for zero bundle-size or maintenance benefit. Tree-shaking already works on named exports from a single file. Re-evaluate only if ui.jsx grows past ~30 components.*

**Note:** splitting into individual files has no functional benefit at this stage. Leave it.

---

## Phase 2 — Create The Shared Farming Brain

**Status: FINAL (2026-05-09)** — All farming logic extracted into `src/lib/` (9 modules). Zero brain logic remains in App.jsx (verified: every top-level function in App.jsx is either a React component or the `dataReducer` state machine). Test work was reassigned to Phase 10 to keep architecture-completion and test-coverage as separate concerns.

- [x] Create `src/lib/` *(used instead of src/core/ — same outcome)*
- [x] Move date helpers into calendar. *(`src/lib/calendar.js` for month names + sow/harvest parsing; `src/lib/utils.js` for local-date helpers)*
- [x] Move crop yield helpers. *(`src/lib/farm-calc.js` — cropMeasureType, plantsFromArea, expectedYield, zoneAreaM2, plotAreaM2, zoneSpaceStats, buildZoneSpaceMap)*
- [x] Move regional crop helpers. *(`src/lib/regional.js` — getRegionalCrop, getRegionalCrops, getRegionalCropMap, rCM, rCR, getRegionalVarieties)*
- [x] Move animal care/calendar helpers. *(`src/lib/regional.js` — getRegionalCalendar; lost during Phase A.5a, restored at commit `befd4da`)*
- [x] Move task generation. *(`src/lib/task-queue.js` — buildTaskQueue)*
- [x] Move AI knowledge engine. *(`src/lib/ai.js` — farmKnowledgeEngine, buildAISuggestions)*
- [x] Run `npm run build`.
- [x] ~~Add simple tests for the most important rules.~~ *(moved to Phase 10 — testing is a separate concern from extraction; Phase 10 already lists test runner setup + tests for crop timing, yield, task generation, storage migrations, and import/export)*

**Bonus extracted beyond the original list:** `src/lib/theme.js` (C, F, TS, SX), `src/lib/migrations.js` (migrateZones, migrateGamify, migrateCompletions, updateGamify), `src/lib/utils.js` (appendLog, local-date helpers, markTaskDone), `src/lib/storage.js` (Phase 4).

---

## Phase 3 — Split Screens Into Feature Folders

**Status: IN PROGRESS (started 2026-05-09)** — 8 of ~9 screens extracted. App.jsx 4037 → 558 lines (-3479 from Phase 3 so far). Each commit: extract one feature, npm run build, verify live bundle hash matches sandbox.

Screens to extract: ~~TodayScreen~~, ~~TaskQueue~~, ~~FarmTab (Farming + Setup + FarmMapHero)~~, ~~Livestock~~, ~~Pantry~~, ~~Financials~~, ~~Manuals (Manuals + Preserving + SeasonalCalendar + Blueprint + Projects)~~, ~~AIAssistant~~, FeedbackSurvey.

- [x] Create `src/features/`. *(Phase 3.1)*
- [x] Move `Pantry` into `src/features/pantry/`. *(commit `4a17087`, 4037 → 3952)*
- [x] Move `Financials` into `src/features/financials/`. *(commit `c42a1aa`, 3952 → 3876)*
- [x] Move `Manuals` into `src/features/manuals/`. *(commit `33a7a14`, 3876 → 3348 — also moved Preserving, SeasonalCalendar, Blueprint, Projects)*
- [x] Move `Animals` into `src/features/animals/`. *(commit `930e9d0`, 3348 → 3189 — Livestock + shared AnimalOverlay)*
- [x] Move `Tasks` into `src/features/tasks/`. *(commit `49011b3`, 3189 → 2380 — TaskQueue + TaskRow; PlotOverlay extracted alongside into `src/features/farm/` because TaskQueue depends on it — same shared-overlay pattern as Phase 3.4 with AnimalOverlay)*
- [x] Move `Farm` into `src/features/farm/`. *(commit `fb8d6e3`, 2380 → 1378 — Setup + Farming + FarmMapHero + FarmTab; only FarmTab default-exported, others are file-internal)*
- [x] Move `Today` into `src/features/today/`. *(commit `5425623`, 1359 → 788 — TodayScreen default-exported)*
- [x] Move `Assistant` into `src/features/assistant/`. *(commit `29cf39d`, 775 → 558 — AIAssistant default-exported; floating chat + autocomplete dropdown + quick-prompt rail)*
- [x] Extract `NAV`, `BOTTOM_TABS`, `MORE_ITEMS` into `src/app/navigation.js`. *(Phase 3.9 — 558 → 529, 11 lucide icons moved alongside config; App.jsx keeps Download/Upload/Leaf/Moon/Sun/User)*
- [ ] Extract `DEF`, `dataReducer` into `src/app/state.js`.
- [x] Run `npm run build` after each feature is moved. *(established workflow)*

**Recommendation:** do this AFTER Supabase integration, not before. Extracting screens while the data layer is still localStorage makes the migration harder.

---

## Phase 4 — Build A Real Storage Layer

**Status: FINAL (2026-05-09)** — `src/lib/storage.js` is the single persistence layer for the whole app. UI never imports `localStorage` directly. Adapter pattern (kvGet/kvSet/kvRemove) is the swap point for Capacitor on mobile or Supabase later. Verified live in production. DB shim removed (zero consumers, dead code) at follow-up commit.

- [x] Create `src/services/storage/`. *(done as `src/lib/storage.js`)*
- [x] Keep current browser storage working.
- [x] Move migration logic into a module. *(`src/lib/migrations.js`)*
- [x] Add clean storage API: `loadFarm()`, `saveFarm()`, `saveFarmImmediate()`, `flushFarm()`, `exportFarm()`, `importFarm()`.
- [x] Make the app talk only to the storage service, not directly to `localStorage`. *(grep src/App.jsx for `localStorage` and `DB.` both return zero hits)*
- [x] Prepare for Capacitor/mobile storage later. *(adapter is the single point of replacement; Capacitor's async API will require turning callers async — that's the natural mobile boundary)*
- [x] Run `npm run build`. *(1753 modules, 659.94 kB, 192.38 kB gz; Mac and sandbox produced byte-identical bundle hashes)*

What landed in commit `3815979`:
- Adapter: `kvGet`, `kvSet`, exported `kvRemove` (for future logout/reset)
- Centralized `KEYS` constant (every storage key lives here)
- Farm data: `loadFarm`, `saveFarm` (debounced 500ms), `saveFarmImmediate`, `flushFarm`, `exportFarm` (returns raw JSON for crash-safe ErrorBoundary backup), `importFarm` (validates by parse, writes raw)
- UI prefs: `loadPage/savePage`, `loadTheme/saveTheme`, `loadFeedbackDone/markFeedbackDone`, `loadFeedbackDismissed/markFeedbackDismissed`, `loadFirstUse/saveFirstUse`
- App.jsx migrated 14 raw `localStorage` calls + 4 `DB.*` calls to zero

Follow-up close-out (2026-05-09): `DB` shim deleted — 12 lines of dead code removed after grep confirmed zero consumers anywhere in `src/`. Bundle dropped from `index-Dp0cxPzd.js` (659.95 kB) to `index-Bvkwd3vE.js` (659.94 kB).

---

## Phase 5 — Add Accounts And Cloud Backup

**Status: NOT STARTED.** Architecture decision made 2026-05-09: Supabase is the backend. Phase 4 storage layer is now behind a clean API and ready for the swap.

Agreed architecture:
- Online-first PWA with offline write queue
- Supabase as source of truth
- localStorage as local cache
- Optimistic writes with mutation queue draining on reconnect
- Last-write-wins via `updated_at`
- Auth: email + Google OAuth

Three open decisions (pending):
1. Do real production users exist whose data must be preserved on migration?
2. Should sign-in be mandatory or optional? (recommended: 7-day trial before requiring it)
3. Extract data/sync layer now or keep monolithic App.jsx temporarily?
   (recommended: hybrid — extract to `src/lib/db.js`, `src/lib/sync.js`, `src/lib/auth.js`; leave UI as one file)

- [ ] Create `src/services/auth/`.
- [ ] Create `src/services/database/`.
- [ ] Create Supabase project.
- [ ] Design database tables: users, farms, zones, plots, animals, pantry, costs, log.
- [ ] Add email login.
- [ ] Add Google login.
- [ ] Let users keep using app without login.
- [ ] Add cloud backup for logged-in users.
- [ ] Keep local offline data as source of truth.

---

## Phase 6 — Add Offline Sync

**Status: NOT STARTED.**

- [ ] Create `src/services/sync/`.
- [ ] Track local changes while offline.
- [ ] Sync changes to Supabase when internet returns.
- [ ] Handle same user on two devices.
- [ ] Decide conflict resolution (agreed: last-write-wins via `updated_at`).
- [ ] Show sync status in the app.
- [ ] Add backup/export fallback if sync fails.

---

## Phase 7 — Prepare For Mobile App Stores

**Status: NOT STARTED. Deferred until content + backend are solid (est. 6–8 weeks).**

- [ ] Add Capacitor to the project.
- [ ] Create iOS project.
- [ ] Create Android project.
- [ ] Move platform-specific code into `src/platform/`.
- [ ] Test local storage on iOS.
- [ ] Test local storage on Android.
- [ ] Test offline mode on iOS and Android.
- [ ] Create app icons and splash screens for stores.

---

## Phase 8 — Payments And Subscriptions

**Status: NOT STARTED.**

Pricing (canonical — verified in public/landing.html line 954):
- 7-day free trial, no card required
- Basic $4.99/mo
- Pro $9.99/mo (AI assistant, multi-zone, analytics)
- Lifetime $190 one-time (early adopter)

- [ ] Create `src/services/payments/`.
- [ ] Keep Stripe for web subscriptions.
- [ ] Research Apple App Store subscription rules before iOS payments.
- [ ] Research Google Play subscription rules before Android payments.
- [ ] Keep paid-feature checks in shared code.
- [ ] Add subscription status service.
- [ ] 72h offline grace token for subscribers.

---

## Phase 9 — Weather, Notifications, And Reminders

**Status: NOT STARTED.**

Agreed: Open-Meteo API (free, no key, 7-day forecast). No push notifications needed yet.

- [ ] Create `src/services/weather/`.
- [ ] Create `src/services/notifications/`.
- [ ] Add Open-Meteo weather for web.
- [ ] Add mobile-safe weather access.
- [ ] Add local reminders for daily farm tasks.
- [ ] Add notification permission screens for iOS and Android.
- [ ] Make reminders use shared task engine from `src/lib/task-queue.js`.

---

## Phase 10 — Testing And Quality Gates

**Status: NOT STARTED.**

- [ ] Make `npm run lint` pass cleanly.
- [ ] Add a test runner.
- [ ] Add tests for crop timing.
- [ ] Add tests for expected yield.
- [ ] Add tests for task generation.
- [ ] Add tests for storage migrations.
- [ ] Add tests for import/export backup.
- [ ] Add a manual release checklist.

---

## What Not To Do Yet

- [ ] Do not rewrite the whole app in React Native yet.
- [ ] Do not create separate farming logic for web, iOS, and Android.
- [ ] Do not add a complicated backend before the local app brain is cleaned up.
- [ ] Do not move everything at once.
- [ ] Do not let payments, sync, and login logic spread randomly through screens.

---

## Decision Log

| Date | Decision |
|------|----------|
| 2026-05-07 | Long-term target is web, iOS, and Android. |
| 2026-05-07 | Best architecture is offline-first, feature-based, with one shared farming brain. |
| 2026-05-07 | Use Capacitor for iOS/Android (not React Native rewrite). |
| 2026-05-07 | Keep current React/Vite app and refactor gradually instead of rebuilding from zero. |
| 2026-05-09 | Supabase migration moved from Phase 6 → Phase 4 (next priority after Phase A). |
| 2026-05-09 | Offline architecture: online-first, localStorage as cache, Supabase as source of truth, mutation queue, last-write-wins via updated_at. |
| 2026-05-09 | Auth: email + Google OAuth via Supabase. |
| 2026-05-09 | Weather: Open-Meteo API (free, no key, 7-day forecast). No push notifications needed yet. |
| 2026-05-09 | Phase A complete. App.jsx reduced from ~6000 to 4031 lines. All data in src/data/, all logic in src/lib/. |
| 2026-05-05 | Market pivot: Western Europe is now the base climate layer (USDA 7-9, maritime temperate). Mediterranean is an override layer, not the base. Default region: western_europe. |
| 2026-05-09 | Screen extraction (Phase 3) deferred until after Supabase integration. Extracting screens while data layer is still localStorage makes migration harder. |
| 2026-05-09 | Phase 4 (storage layer) shipped at commit `3815979`. `src/lib/storage.js` is now the single persistence layer with adapter pattern, centralized `KEYS`, full farm-data API, and UI pref helpers. App.jsx has zero raw `localStorage` and zero `DB.*` references. Verified live: bundle hash matches sandbox build byte-for-byte; all six storage keys appear exactly once in the live bundle inside the minified `KEYS` object. |
| 2026-05-09 | `DB` shim kept in storage.js as a thin alias for backward compat. No remaining call sites in the codebase. Can be deleted in a follow-up commit when we're confident no future feature work reaches for it. |
| 2026-05-09 | Phase 0/1/2/4 walkthrough — every required bullet verified against actual codebase, all four phases marked FINAL. `DB` shim deleted (zero consumers confirmed). Phase 2's "add tests" bullet reassigned to Phase 10. Phase 1's "split ui.jsx" optional bullet deliberately not done — would add boilerplate without benefit at 13 components / 10 KB. Phase 3 deferred to a separate chat per Dervis. |
| 2026-05-09 | Phase 3 (screen extraction) starts now, ahead of Phase 5. Overrides the earlier "defer until after Supabase" note — Dervis chose to go feature-folder-first. |
| 2026-05-09 | Phase 5 inputs locked: **no production users to migrate** — clean-slate Supabase rollout, no migration script needed. |
| 2026-05-09 | Phase 5 inputs locked: **mandatory sign-in** — auth wall before any app access. Phase 5 bullet "Let users keep using app without login" is OVERRIDDEN. Landing CTA goes to sign-up, not directly to /app. |
| 2026-05-09 | Phase 5 inputs locked: **hybrid extraction** — `src/lib/db.js` (Supabase client), `src/lib/sync.js` (mutation queue), `src/lib/auth.js` (auth wrapper). UI remains in feature folders post-Phase-3. |
| 2026-05-09 | Phase 3.2 (Financials extraction) shipped at commit `c42a1aa`. Local + live bundle md5 byte-identical (`1b3570aae9d44ba9e5c80fdb5224256c`). All 6 marker strings verified in deployed `index-CofRtakY.js`. App.jsx 3952 → 3876 lines. 4 pre-existing eslint unused-import warnings in App.jsx flagged for separate cleanup commit. |
| 2026-05-09 | Phase 3.3 (Manuals extraction) shipped at commit `33a7a14`. Moved Manuals + 4 sibling screens (Preserving, SeasonalCalendar, Blueprint, Projects) into `src/features/manuals/Manuals.jsx`. App.jsx 3876 → 3348 lines (-527). Bundle 652 kB / 189 kB gz. Deployed READY at `dpl_AEjewBcyiz7ZcyBybXPsecjWjQ11`. *(Doc update for this commit was rolled into the Phase 3.4 doc commit, since 3.3 → 3.4 happened back-to-back.)* |
| 2026-05-09 | Phase 3.4 (Animals extraction) shipped at commit `930e9d0`. Moved Livestock + shared AnimalOverlay into `src/features/animals/`. AnimalOverlay imported back into App.jsx because TaskQueue and TodayScreen still consume it (will resolve when those screens are extracted in later 3.x commits). App.jsx 3348 → 3189 lines (-159). BREEDS import dropped from App.jsx (no remaining consumers). Bundle filename `index-J0lGSxWP.js` byte-identical between sandbox and Mac. All 8 marker strings ("Manage your animals, collect produce", "Layer Flock A", "Tap for guide", "Care Guide", "Egg production: ~", "Injuries & Treatment", "Suggested daily", "🥚 Collect Eggs") verified in live bundle on `myterra-sigma.vercel.app`. Deployed READY at `dpl_7kFLEXGgtj7T6YLqM5GKeBKPWAph`. The same 8 pre-existing eslint unused-import warnings in App.jsx (untouched by this commit) still pending a separate cleanup. |
| 2026-05-09 | Phase 3.5 (Tasks + PlotOverlay extraction) shipped at commit `49011b3`. Moved TaskRow + TaskQueue into `src/features/tasks/TaskQueue.jsx` (695 lines) and PlotOverlay into `src/features/farm/PlotOverlay.jsx` (137 lines). PlotOverlay extracted alongside because TaskQueue depends on it — keeping it in App.jsx would create a circular import. Farming and TodayScreen still consume PlotOverlay via the new feature import; this prepares the `src/features/farm/` folder for Phase 3.6 Farm extraction. App.jsx 3189 → 2380 lines (-809). Dropped now-unused symbols from App.jsx imports: `POULTRY_SPECIES`, `HOOFED_SPECIES`, `GRAZER_SPECIES`, `animalPlural`, `plotAreaM2`. Bundle 1760 modules, 652.17 kB / 189.44 kB gz, filename `index-CZA0h12s.js` byte-identical between Mac and live deployment (md5 `6c4b258274a4c9c07ee5a308352e34f0`). All 7 marker strings ("Task Calendar", "Needs Attention", "Daily Routine", "Hive inspection", "Hoof check", "Crop data not found", "Companions in zone") verified in live bundle. Deployed READY at `dpl_B1BapLjGFxqkbx6uA88CWJXXocfK`. 1 newly-orphaned eslint unused-import warning (`toLocalDateKey`) on top of the 8 pre-existing — total 9, still pending a separate cleanup commit. *Note: a parallel Codex chat had been making CSS-variable refactor edits across 12 files; per Dervis these were discarded entirely (stash dropped, every Codex-touched file reverted) and Phase 3.5 was shipped clean against the original HEAD `0a937d4`.* |
| 2026-05-09 | Phase 3.6 (Farm extraction) shipped at commit `fb8d6e3`. Moved Setup + Farming + FarmMapHero + FarmTab into `src/features/farm/Farm.jsx` (1016 lines). Only FarmTab is default-exported; the other three are file-internal since FarmTab is the only external consumer. Setup and FarmMapHero used CROP_COLORS + ZT_MAP which stay in App.jsx (still consumed by TodayScreen). App.jsx 2380 → 1378 lines (-1002). Dropped now-unused symbols from App.jsx imports: `uid`, `appendLog`, `searchCity`, `CITY_DB`, `REGIONS`, `REGION_MAP`, `getRegionalCrops`, `ZT`, `COMP`, `cropMeasureType`, `plantsFromArea`, `expectedYield`, `getRegionalVarieties` (13 symbols total). Bundle 1761 modules, 652.19 kB / 190.43 kB gz, filename `index-CIxUaiWF.js` byte-identical between Mac and live deployment (md5 `92804c0cf74cc5aaa3f6a3352d881004`). All 8 marker strings ("Farm Designer", "HOW MUCH ARE YOU PLANTING?", "Small Homestead", "Medium Farm", "Edit Layout", "Plant a Crop", "Active Crops", "Climate Region") verified in live bundle. Deployed READY at `dpl_8YaaHVS156zPDm4ZPQwqXpzZm5Yu`. Eslint clean (`npx eslint src/App.jsx src/features/farm/Farm.jsx` returned exit 0 with zero output). |
| 2026-05-10 | Phase 3.7 (TodayScreen extraction) shipped at commit `5425623`. Moved TodayScreen into `src/features/today/TodayScreen.jsx` (581 lines, default-exported). Only the function body and the `DASHBOARD` comment header were removed from App.jsx; no other restructuring. App.jsx 1359 → 788 lines (-571). TodayScreen.jsx imports: react hooks (useState, useEffect, useMemo), C/F/SX from lib/theme, ZT_MAP from data/zones, CROPS+CROP_COLORS from data/crops, BADGES, todayLocalKey/localDateFromKey/addDaysToLocalKey/daysBetweenLocalKeys/markTaskDone from lib/utils, rCM from lib/regional, buildZoneSpaceMap from lib/farm-calc, Card/Pill/Tooltip/Ring from components/ui, AnimalOverlay from features/animals, PlotOverlay from features/farm. No lucide-react icons needed. Bundle 1762 modules, 652.19 kB / 190.43 kB gz, filename `index-DqJAPVGt.js` byte-identical between Mac dist and live deployment (md5 `137f6097175d949f0ff62c6afe10f208` via direct curl). All 10 marker strings ("Today's Work", "Task Pipeline", "Click a task or zone", "Recent Activity", "Achievements", "Your garden awaits", "Edit Map", "ready to harvest", "no transactions", "MyTerra") verified in live bundle on `myterra-sigma.vercel.app`. Deployed READY at `dpl_FULLwXi8bPWaP8i8nuZRtVj2PTXf`. Unused imports in App.jsx grew to ~37 (28 newly-orphaned by this commit + 9 pre-existing) — deferred to a separate cleanup commit per established pattern. |
| 2026-05-10 | **Pre-existing bug discovered (NOT introduced by Phase 3.7):** `<SeasonalCalendar>` is referenced at App.jsx switch case `"season"` but isn't imported — it lives inside `src/features/manuals/Manuals.jsx` without being exported. Bug introduced in Phase 3.3 (commit `33a7a14`, 2026-05-09): SeasonalCalendar was extracted into Manuals.jsx as a file-internal helper without re-exporting it, and the App.jsx switch case wasn't updated. The Seasonal nav button (sidebar + mobile More drawer) has been broken in production since May 9 — clicking it triggers `Element type is invalid` and lands the user in the ErrorBoundary. Fix held back from this commit to keep Phase 3.7 a clean extraction. Fixed in commit `f359230` (2026-05-10) by exporting SeasonalCalendar from Manuals.jsx and adding `{ SeasonalCalendar }` to the named-import in App.jsx. |
| 2026-05-10 | Phase 3.8 (AIAssistant extraction) shipped at commit `29cf39d`. Moved AIAssistant + autocomplete dropdown + quick-prompt rail into `src/features/assistant/AIAssistant.jsx` (225 lines, default-exported). App.jsx 775 → 558 lines (-217). Dropped from App.jsx imports: `useRef` (only consumer was AIAssistant) and the entire `./lib/ai` import line (`farmKnowledgeEngine`, `buildAISuggestions` — only consumers were inside AIAssistant). AIAssistant.jsx imports: react hooks (useState, useEffect, useMemo, useRef), Leaf from lucide-react, C/F/SX from lib/theme, LDB from data/livestock, rCR from lib/regional, farmKnowledgeEngine + buildAISuggestions from lib/ai. Bundle 1763 modules, 659.77 kB / 194.51 kB gz, filename `index-e_P-vcqi.js` byte-identical between Mac dist and live deployment (md5 `688f167e1e708339287d8f2f11ca0f6c` via direct curl). All 8 marker strings ("Farm Assistant", "What should I plant now", "Type 2+ letters to see suggestions", "Type a crop or animal name", "Companion planting tips", "How to grow tomatoes", "Watering tips for my crops", "Chicken care guide") verified in live bundle on `myterra-sigma.vercel.app`. Deployed READY at `dpl_3yHicwYZcpEtmW5v3iFzBfne8Hh1`. Eslint clean on both App.jsx and AIAssistant.jsx. All 8 feature screens now live in `src/features/`; only FeedbackSurvey + FeedbackPrompt + AppInner + ErrorBoundary + BottomNav + MoreDrawer remain in App.jsx alongside DEF / dataReducer / NAV config. |
| 2026-05-11 | Phase 3.9 (NAV config extraction) shipped at commit `c09ba81`. Moved `NAV`, `BOTTOM_TABS`, and `MORE_ITEMS` out of App.jsx into a new `src/app/navigation.js` (38 lines). App.jsx 558 → 529 lines (-29). The 11 lucide-react icons that were only used by navigation config (Home, ClipboardList, Sprout, Rabbit, CalendarDays, Package, TrendingUp, BookOpen, MessageSquare, MoreHorizontal, PawPrint) moved alongside the config. App.jsx now imports only the 6 lucide icons it still renders directly: Download, Upload, Leaf, Moon, Sun, User (sidebar brand, export/import buttons, dark-mode toggle, MoreDrawer profile avatar). New `src/app/` directory introduced — first non-`features/`, non-`lib/`, non-`data/`, non-`components/` location for code that organises App.jsx itself. Bundle 1764 modules, 659.77 kB / 194.51 kB gz, filename `index-CrkbOzjf.js` byte-identical between Mac sandbox build and live deployment (md5 `7d5546a81a811c9bbdf799ea00342a09` confirmed via direct curl). All 6 marker strings — "Animals" (4×, BOTTOM_TABS), "Livestock" (4×, NAV), "Task Queue" (1×, MORE_ITEMS only), "Give Feedback" (1×, NAV+MORE_ITEMS), "Seasonal" (4×), "Financials" (3×) — verified in live bundle on `myterra-sigma.vercel.app`. Deployed READY at `dpl_9Ra97hejzrrbwDrXrRX5o9JUR3xR`. Eslint clean on both App.jsx and navigation.js. Remaining Phase 3 work: `DEF` + `dataReducer` → `src/app/state.js`. FeedbackSurvey/FeedbackPrompt extraction not yet scheduled. |
