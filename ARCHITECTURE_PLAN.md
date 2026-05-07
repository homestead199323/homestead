# MyTerra Architecture Plan

**Goal:** prepare MyTerra for web, iOS, and Android without rebuilding the app from zero.

This is the living checklist for architecture work. When a task is finished, change `[ ]` to `[x]` and add a short note if needed.

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

## Target Folder Structure

This is the direction we are moving toward. It does not need to happen all at once.

```text
src/
  app/
    App.jsx
    navigation.js
    migrations.js

  core/
    crops/
    animals/
    tasks/
    calendar/
    yields/
    pantry/
    financials/

  data/
    crops.js
    breeds.js
    varieties.js
    regions.js
    regional-overrides.js
    companions.js

  services/
    storage/
    auth/
    sync/
    database/
    payments/
    weather/
    notifications/

  features/
    today/
    farm/
    tasks/
    animals/
    pantry/
    financials/
    manuals/
    assistant/

  components/
    Button.jsx
    Card.jsx
    Overlay.jsx
    Pill.jsx
    FormField.jsx

  platform/
    web/
    mobile/
```

Plain meaning:

- `core/` is the farming brain.
- `data/` is the farming knowledge database.
- `services/` is login, storage, sync, payments, weather, and notifications.
- `features/` is the main product areas users see.
- `components/` is reusable UI like buttons, cards, and popups.
- `platform/` is code that behaves differently on web versus mobile.

---

## Phase 0 — Protect The Working App

Before architecture work starts, make sure the current app has basic safety checks.

- [ ] Confirm `npm run build` passes before each architecture change.
- [ ] Confirm the app opens locally after each architecture change.
- [ ] Avoid changing product behavior during pure architecture cleanup.
- [ ] Keep each change small enough to understand and undo.
- [ ] Do not start mobile packaging until the shared app brain is separated from screen code.

**Why this matters:** the app already works. The goal is to make it easier to improve, not to break it while organizing.

---

## Phase 1 — Split The Reusable UI Pieces

Move small shared visual pieces out of `src/App.jsx` first. This is the safest cleanup.

- [ ] Create `src/components/`.
- [ ] Move `Btn` into `src/components/Button.jsx`.
- [ ] Move `Card` into `src/components/Card.jsx`.
- [ ] Move `Overlay` into `src/components/Overlay.jsx`.
- [ ] Move `Pill` into `src/components/Pill.jsx`.
- [ ] Move form fields such as `Inp`, `Sel`, and `Txt` into reusable component files.
- [ ] Replace imports in `App.jsx` so the app still looks and behaves the same.
- [ ] Run `npm run build`.
- [ ] Open the app and check Today, Farm, Animals, Pantry, Financials, and Assistant.

**Done when:** `App.jsx` is smaller, shared UI is reusable, and nothing looks different to the user.

---

## Phase 2 — Create The Shared Farming Brain

Move farming rules out of screen code and into `src/core/`.

- [ ] Create `src/core/`.
- [ ] Move date helpers into `src/core/calendar/`.
- [ ] Move crop yield helpers into `src/core/yields/`.
- [ ] Move regional crop helpers into `src/core/crops/`.
- [ ] Move animal care/calendar helpers into `src/core/animals/`.
- [ ] Move task generation into `src/core/tasks/`.
- [ ] Make Today, Tasks, Assistant, and Farm screens use the same task/crop logic.
- [ ] Add simple tests for the most important rules.
- [ ] Run `npm run build`.

**Done when:** the app has one shared place for farming rules, instead of each screen having its own hidden logic.

---

## Phase 3 — Split Screens Into Feature Folders

Move one user-facing area at a time into `src/features/`.

- [ ] Create `src/features/`.
- [ ] Move `Pantry` into `src/features/pantry/`.
- [ ] Move `Financials` into `src/features/financials/`.
- [ ] Move `Manuals` into `src/features/manuals/`.
- [ ] Move `Animals` into `src/features/animals/`.
- [ ] Move `Tasks` into `src/features/tasks/`.
- [ ] Move `Farm` into `src/features/farm/`.
- [ ] Move `Today` into `src/features/today/`.
- [ ] Move `Assistant` into `src/features/assistant/`.
- [ ] Keep navigation in `src/app/navigation.js`.
- [ ] Run `npm run build` after each feature is moved.

**Done when:** changing Pantry does not require digging through Farm, Assistant, or Today code.

---

## Phase 4 — Build A Real Storage Layer

Today the app saves mostly through browser `localStorage`. For iOS and Android, storage needs to be hidden behind a cleaner layer.

- [ ] Create `src/services/storage/`.
- [ ] Keep current browser storage working.
- [ ] Add a storage API with plain functions like `loadFarm()`, `saveFarm()`, `exportFarm()`, and `importFarm()`.
- [ ] Move migration logic into `src/app/migrations.js`.
- [ ] Make the app talk only to the storage service, not directly to `localStorage`.
- [ ] Prepare the storage service so Capacitor/mobile storage can be added later.
- [ ] Run `npm run build`.

**Done when:** the app does not care whether data is saved in browser storage, phone storage, or later cloud sync.

---

## Phase 5 — Add Accounts And Cloud Backup

This is where Supabase should enter, but only after the local architecture is cleaner.

- [ ] Create `src/services/auth/`.
- [ ] Create `src/services/database/`.
- [ ] Add Supabase project.
- [ ] Design the database tables for farms, zones, crops, animals, pantry items, costs, and logs.
- [ ] Add email login.
- [ ] Add Google login.
- [ ] Let users keep using the app without login at first.
- [ ] Add cloud backup for logged-in users.
- [ ] Keep local offline data as the first source of truth.

**Done when:** a user can log in and back up their farm, but the app still works offline.

---

## Phase 6 — Add Offline Sync

This is one of the most important phases for a farm app.

- [ ] Create `src/services/sync/`.
- [ ] Track local changes while offline.
- [ ] Sync changes to Supabase when internet returns.
- [ ] Handle the same user opening the app on two devices.
- [ ] Decide what happens when two devices edit the same item.
- [ ] Show a simple sync status in the app.
- [ ] Add backup/export fallback in case sync fails.

**Done when:** the app works in the field without internet, then updates the cloud later.

---

## Phase 7 — Prepare For Mobile App Stores

Use Capacitor first so the current React app can become iOS and Android apps without a full rewrite.

- [ ] Add Capacitor to the project.
- [ ] Create iOS project.
- [ ] Create Android project.
- [ ] Move platform-specific code into `src/platform/`.
- [ ] Test local storage on iOS.
- [ ] Test local storage on Android.
- [ ] Test offline mode on iOS and Android.
- [ ] Test camera/photo access if farm photos are added.
- [ ] Test push/local notifications if reminders are added.
- [ ] Create app icons and splash screens for stores.

**Done when:** the same MyTerra app can run as web, iOS, and Android.

---

## Phase 8 — Payments And Subscriptions

Payments need special care because web payments and mobile app store payments are different.

- [ ] Create `src/services/payments/`.
- [ ] Keep Stripe for web subscriptions.
- [ ] Research Apple App Store subscription rules before adding iOS payments.
- [ ] Research Google Play subscription rules before adding Android payments.
- [ ] Keep paid-feature checks in shared code, not scattered across screens.
- [ ] Add a simple subscription status service.
- [ ] Make sure free users, trial users, and paid users all have clear app states.

**Done when:** paid features can be controlled from one shared place across web, iOS, and Android.

---

## Phase 9 — Weather, Notifications, And Reminders

These should be services, not hardcoded inside screens.

- [ ] Create `src/services/weather/`.
- [ ] Create `src/services/notifications/`.
- [ ] Add weather provider for web.
- [ ] Add mobile-safe weather access.
- [ ] Add local reminders for daily farm tasks.
- [ ] Add notification permission screens for iOS and Android.
- [ ] Make reminders use the shared task engine from `src/core/tasks/`.

**Done when:** Today, Tasks, and mobile notifications all use the same task rules.

---

## Phase 10 — Testing And Quality Gates

Future changes get easier only if the app can warn us before something breaks.

- [ ] Make `npm run lint` pass.
- [ ] Add a test runner.
- [ ] Add tests for crop timing.
- [ ] Add tests for expected yield.
- [ ] Add tests for task generation.
- [ ] Add tests for storage migrations.
- [ ] Add tests for import/export backup.
- [ ] Add a simple manual release checklist.
- [ ] Before every release, run build, lint, tests, and mobile smoke checks.

**Done when:** changes feel safer because the app checks the important rules automatically.

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
|---|---|
| 2026-05-07 | Long-term target is web, iOS, and Android. |
| 2026-05-07 | Best architecture is offline-first, feature-based, with one shared farming brain. |
| 2026-05-07 | Use Capacitor first for iOS/Android unless the app later needs a full native rewrite. |
| 2026-05-07 | Keep current React/Vite app and refactor gradually instead of rebuilding from zero. |

