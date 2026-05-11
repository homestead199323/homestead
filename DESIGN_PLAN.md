# MyTerra — UX/UI design plan

**Scope:** PWA design only. No native, no App Store, no monetization mechanics. Every change ships through `src/App.jsx`, `index.html`, CSS, and Vercel auto-deploy.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## North star

**Mood sentence:** *A calm, modern coach that helps anxious millennials grow their first plants without feeling stupid.*

**Design lane:** Notion × Planta hybrid.

- **From Notion:** calm density, sidebar IA, quiet metadata pills, restrained color (one accent on neutral), proper typography hierarchy, no decorative noise.
- **From Planta:** warm palette, conversational microcopy, plant-as-companion framing, illustrated empty states, gentle care patterns.
- **Arbitration rule when they conflict:** headers, copy, and empty states lean Planta. Lists, detail views, and dense data lean Notion. Cream backgrounds carry the warmth, forest green carries the accent restraint.

**Reference apps to keep open while working:** Planta (visual + tone), Things 3 (task interaction), Apple Fitness (stat visualization), Notion mobile (IA on small screens).

---

## Locked decisions (2026-05-07)

1. Lane: Notion × Planta hybrid.
2. Palette: keep cream + forest green, refine the exact tones.
3. Icons: Lucide React + Twemoji-as-SVG bridge for now. Custom illustrated set is a later commission.
4. This file is the working plan. Update statuses as we ship.

---

## Phase 1 — Foundations (must precede pixel work)

- [x] **1.1 Tokenize the design.** `:root` block added to `index.css` — all colors, shadows, radius, spacing, type scale as CSS vars. `theme.js` C values now reference `var(--...)`. Dark-mode ready.
- [x] **1.2 Refine cream + forest tones.** `--color-bg: #f7f6f3` (warm neutral, not orange). `--color-green: #2e6b52` (more sage). `--color-green-light: #3d9970`. Font import trimmed to 400+600 only.
- [x] **1.3 Type scale.** `--text-xs/sm/base/md/lg/xl` vars (12/14/16/18/22/28). `TS` export added to `theme.js`. Body font-size set to `var(--text-base)` in CSS.
- [x] **1.4 Component library audit.** Components: `Btn` (6 variants: primary/secondary/danger/ghost/success/orange), `Card`, `Inp`, `Sel`, `Txt`, `Overlay`, `Pill`, `Tooltip`, `Ring`, `Stat`. No duplicate definitions. Fixed 3 raw `<button>` elements in FeedbackSurvey/FeedbackPrompt that bypassed `<Btn>`. **Remaining for Phase 3.5:** ~15 inline `<span>` pills throughout that need `<Pill tone="...">` consolidation.

## Phase 2 — Mobile-responsive PWA

The current `@media (width <= 700px)` block contains 3 rules. This is the single largest gap.

- [x] **2.1 Real breakpoints.** 0–479 phone, 480–767 phablet, 768–1023 tablet, 1024+ desktop. Each gets a dedicated layout.
- [x] **2.2 Bottom-tab navigation on mobile.** Five tabs: **Today / Farm / Animals / Pantry / More.** "More" holds Calendar, Financials, Manuals, Settings. Sidebar collapses to this on phone, becomes a rail on tablet, stays as today on desktop.
- [x] **2.3 Stack-first layout on phone.** All grids collapse to single column. `.g2/.g3/.g5` utility classes in CSS; 6 fixed grids in App.jsx converted.
- [x] **2.4 Bottom sheets for detail views.** Overlay component slides up from bottom on phone. `.overlay-backdrop/.overlay-sheet/.overlay-handle-row` CSS classes added.
- [ ] **2.5 Swipe gestures on lists.** Swipe-right to mark done. Swipe-left to delete with red reveal. Pull-to-refresh on Today and Tasks.
- [x] **2.6 Touch targets 44px buttons / 56px+ rows and gesture areas.** Close, calendar nav, AI send all 44px+. Global `button { min-height: 44px }` in CSS.
- [x] **2.7 Safe-area + viewport correctness.** `viewport-fit=cover`, `env(safe-area-inset-*)` everywhere.
- [ ] **2.8 Real-device testing.** iPhone SE 2020, iPhone 14+, Pixel 6a, iPad Mini.


## Phase 3 — Visual identity and design system

- [x] **3.1 Icons: Lucide React + Twemoji-as-SVG bridge.** `lucide-react` added. NAV, BOTTOM_TABS, MORE_ITEMS all use Lucide component refs (`E` property). Sidebar nav, bottom nav, MoreDrawer all render `<n.E size={...}>`.
- [x] **3.2 Iconography rule of thumb.** Custom/Lucide icon for navigation and primary identity. Twemoji for content (crops, animals). Native emoji ONLY for celebration moments. Three tiers, one rule each.
- [x] **3.3 Dark mode.** `[data-theme="dark"]` CSS token block + `@media (prefers-color-scheme: dark)` auto-detect. `darkMode` state with lazy initializer (localStorage + system pref). Moon/Sun toggle in sidebar footer + MoreDrawer. Persists to `localStorage` (`hfm_theme` key).
- [x] **3.4 Lucide icon swap pass.** Sidebar brand header: `🌾` → `<Leaf/>`. AI chat FAB header: `🌾` → `<Leaf/>`. Pantry + Financials delete buttons: `🗑` → `<Trash2/>`. `Trash2` added to imports. **Note:** remaining `🌾` instances are all content/data (AI suggestion chips, harvest label, `_catIcons.Grain`) — intentionally left as emoji per iconography tiers. **Also fixed in this session:** `Map` lucide import renamed to `MapIcon` to prevent Rolldown minification shadowing global `Map` constructor (was causing `TypeError: A is not a constructor` crash). `getRegionalCalendar` function restored — was dropped during Phase A data module extraction (commit 58cdf57), not exported from `regional-overrides.js`.
- [x] **3.5 Pill/badge consolidation.** `Pill` extended with `sm` (10px/2px 8px) and `border` props. 14 inline `<span>` pills across 7 locations replaced: task priority zone label, zone status, seasonal card (×2), seasonal detail (×3), farm crop picker (×3), manuals DIY card (×2), manuals DIY detail (×4). Notification badges (nav, attention button) left as-is — different semantic purpose.

## Phase 4 — Information architecture rethink

- [x] **4.1 Today replaces Dashboard.** `function Dashboard` → `TodayScreen`; NAV "Home"→"Today"; routing updated; "Back to Today" in FeedbackSurvey.
- [x] **4.2 Calm-default greeting.** Urgent highlight changed red→orange; copy: "a quiet day 🌿" / "N need attention" / "on your walk today". Background gradient also softened.
- [x] **4.3 Farm map promoted to hero on Farm tab.** `FarmMapHero` component — full-width zone map with crop patches, grid overlay, legend, empty-state CTA.
- [x] **4.4 Module consolidation.** `FarmTab` wrapper with Map/Crops/Layout segmented control. `setup` removed from NAV + MORE_ITEMS; "Farming"→"Farm" in NAV. "Edit Map" in TodayScreen routes to `farm?tab=setup`. *Mobile/desktop "Livestock" vs "Animals" mismatch resolved 2026-05-11 by pulling 6.3.1 + 6.3.2 forward — both navs now show "Animals" with the `PawPrint` icon.*
- [x] **4.5 Manuals integrated into context.** "📖 Need help growing X? See the Manuals →" button in PlotOverlay (closes overlay, navigates to Manuals). Available wherever `setPage` is in scope.
- [x] **4.6 Settings out of the way.** Profile avatar section added at top of MoreDrawer (`User` icon in Lucide import; "My Farm / Free plan" label).


## Phase 5 — Today screen (the daily habit loop)

This screen is 80% of why someone keeps using MyTerra.

- [ ] **5.1 Hero block.** Greeting + date + weather snippet ("Cool and cloudy in London — good for transplanting"). Wire OpenWeather API.
- [~] **5.2 Streak module.** Small streak stat exists (TodayScreen.jsx lines 168-170, shows `g.streak` with 🔥 at 7+ days). Still owed: hero sizing, Duolingo-flame energy, week-strip showing last 7 days, Streak Freeze mechanic to forgive one missed day per week.
- [x] **5.3 Three rings.** Apple Fitness pattern. Tasks done / Plants growing / Harvest readiness. Three nested rings shipped at TodayScreen.jsx lines 154-156. Rings themselves not tappable; cards directly below them are (drill-in works via card onClick). Third ring diverged from original plan ("Pantry stocked" → "Harvest readiness") — kept as shipped, harvest readiness is the more useful daily signal.
- [ ] **5.4 "Start your walk" CTA.** Single primary button. Launches guided sequence — one task per screen, swipe-up to complete, soft chime, end-of-walk summary card.
- [~] **5.5 Recent activity feed.** Plain log feed exists (TodayScreen.jsx line 541, shows last 5 entries from `data.log`). Still owed: contextual CTAs like "Yesterday you harvested 4kg mint — preserve some?" with one-tap shortcut to the right Pantry workflow.
- [ ] **5.6 Glanceable secondary tiles.** Bento-grid below the hero — mixed sizes, not equal-width KPI row.

## Phase 6 — Module-by-module fixes

### Tasks
- [ ] **6.1.1** Replace pre-completion "Done" buttons with checkboxes (Things 3 model).
- [ ] **6.1.2** After tap: checkbox fills, row fades, slides to "Done" section with FLIP animation.
- [ ] **6.1.3** Group sections collapsible. Calendar at bottom uses a friendlier date-picker style.

### Farm (was Farm Layout + Farming)
- [ ] **6.2.1** Merge into Farm tab with Map / Crops / Setup segmented control.
- [ ] **6.2.2** First-visit tutorial overlay on Farm Designer ("Drag a zone, name it, set its size").
- [ ] **6.2.3** "+ Plant" CTA inside each zone card on the map — contextual.
- [ ] **6.2.4** Crop detail opens as a bottom sheet, not full-screen.

### Livestock → Animals
- [x] **6.3.1** Renamed "Livestock" → "Animals" across all user-facing surfaces: desktop sidebar NAV (`src/app/navigation.js`), Animals page header (`Livestock.jsx`), Projects category color map (`Manuals.jsx`), Chicken Coop project category (`projects.js`), AI assistant output strings (`lib/ai.js`). FeedbackSurvey modules array also refreshed end-to-end (Dashboard→Today, Farm Layout+Farming→Farm, Seasonal Calendar→Seasonal, Livestock→Animals, "Smart offline farm assistant"→"Farm Assistant"). Component name `Livestock`, route id `"live"`, and code/data-file references kept unchanged.
- [x] **6.3.2** Sidebar icon swapped `Rabbit` → `PawPrint` to match the mobile bottom-tab icon. Plan note about "currently goat" was outdated — actual icon was `Rabbit`. `Rabbit` import dropped from navigation.js.
- [ ] **6.3.3** Animal detail view: feeding schedule, last collected eggs, photo upload slot.


### Seasonal
- [ ] **6.4.1** Month strip auto-scrolls to current month.
- [ ] **6.4.2** Difficulty pills (Easy/Medium/Hard) get real contrast — current colors too close.
- [ ] **6.4.3** Move "New to farming?" tip to top of every month, not just current.

### Pantry
- [ ] **6.5.1** Hero count tile at top ("4 items, 4 kg total — your shelf is starting to fill").
- [ ] **6.5.2** Empty state with illustrated mason jar + "Your harvest will live here."
- [ ] **6.5.3** Keep the "Eat" button — it's delightful.

### Financials
- [ ] **6.6.1** Empty state replaces the broken-looking single-bar chart with an illustration + "Add your first seed packet to start tracking."
- [ ] **6.6.2** Chart only renders when ≥2 data points exist.
- [ ] **6.6.3** Categorize spending visually — pie or stacked bar.

### Manuals
- [ ] **6.7.1** Bigger, more visual crop cards. Current rows feel admin-table.
- [ ] **6.7.2** Search bar sticky on scroll.

### Farm Assistant FAB
- [ ] **6.8.1** Replace 🌾 with custom Lucide icon (chat-bubble + sprout) or illustrated avatar.
- [ ] **6.8.2** Subtle pulse every 30s when there's an unanswered task.
- [ ] **6.8.3** Position respects bottom-tab bar on mobile.

## Phase 7 — Onboarding (the first 90 seconds)

- [ ] **7.1 Story-style 4-screen intro.** Welcome → Where do you live (region + city) → Sketch your farm (drag one zone, 30s) → Pick your first plants (we suggest 3 forgiving ones for your month/region).
- [ ] **7.2 End on a win.** Drop user on Today screen with one task already there: "Water your basil today."
- [ ] **7.3 Skip-friendly.** Every step skippable. Defaults sensible.
- [ ] **7.4 No login wall.** Keep localStorage-only for the design phase. Account creation only gated to paid features later.


## Phase 8 — Motion polish

- [ ] **8.1 FLIP for every list reorder.** Tasks moving between sections, plants between zones — they glide, never snap. `react-flip-toolkit` or hand-rolled.
- [ ] **8.2 Spring physics on draggable elements.** Framer Motion's `spring` config. Farm Designer drag, bottom-sheet drag, swipe-to-complete.
- [ ] **8.3 Shared-element transitions.** Tap a crop on the farm map → zone card expands smoothly into its detail sheet. View Transitions API + React 19 `useTransition`.
- [ ] **8.4 Achievement = full-screen moment.** Confetti, badge zooms in with overshoot bounce, optional vibration via Web Vibration API on Android. 1.5–2s hold, dismissable by tap.
- [ ] **8.5 Living farm map.** Watered plots subtly glisten for an hour. Urgent zones pulse red. Day/night affects map tint slightly. Plants "grow" — % indicator increases over time.
- [ ] **8.6 Reduce-motion compliance.** Already in CSS — extend to JS animations. Test with system setting on.
- [ ] **8.7 Skeletons not spinners.** Use existing `shimmer` keyframe consistently for any data load.

## Phase 9 — Microcopy and tone pass

- [ ] **9.1 String audit.** Replace "TODAY'S WORK" → "Today's farm walk." "8 urgent" → "Three things to do today." "Manage your animals, collect produce, track care" → "Your crew."
- [ ] **9.2 Empty-state copy.** Each empty state: one line of warmth + one CTA.
  - Pantry empty: "Your shelf is bare — let's plant something."
  - Animals empty: "No crew yet — chickens are a forgiving first try."
  - Financials empty: "No expenses yet — add your seed receipts and we'll handle the math."
- [ ] **9.3 Error messages.** Every alert/console error needs a friendly equivalent. "Couldn't save — your phone may be offline. We'll sync when you're back."
- [ ] **9.4 Microinteractions speak.** Button labels morph after tap: "Mark watered" → "Watered ✓". Tiny toast confirmations.

## Phase 10 — Accessibility

- [ ] **10.1 WCAG 2.2 AA contrast** on every text/background pair. Tokens make this a one-pass fix.
- [ ] **10.2 Screen reader labels.** Every emoji-only or icon-only button gets `aria-label`.
- [ ] **10.3 Color is never the only signal.** Urgency pairs color with shape (icon, dot, indicator).
- [ ] **10.4 Keyboard nav on desktop.** Tab order, focus rings, escape closes sheets.
- [ ] **10.5 Dynamic Type.** Use `rem` not `px` so user zoom works.


---

## Suggested execution order (5–7 weeks if Claude patches the codebase)

| Week | Focus | Status |
|---|---|---|
| 1 | Phase 1 (tokenize, type, components) + Phase 3.1–3.2 (Lucide+Twemoji swap) | ✅ Done |
| 2 | Phase 2 (mobile breakpoints + bottom-tab nav + stack layouts) | ✅ Done (2.5 + 2.8 deferred) |
| 3 | Phase 3.3–3.5 (dark mode, icon swap pass, pill consolidation) | ✅ Done |
| 4 | Phase 4 + Phase 5 (IA rethink + Today screen redesign) | ✅ Phase 4 done; Phase 5 partial — 5.3 done, 5.2 + 5.5 partial, 5.1 + 5.4 + 5.6 not started |
| 5 | Phase 6 (module-by-module fixes) | not started |
| 6 | Phase 8 (motion polish) | not started |
| 7 | Phase 7 + Phase 9 + Phase 10 (onboarding + microcopy + a11y) | not started |

**Next up: Phase 5** — Today screen redesign (hero section, priority queue, zone-focused layout).

Phases run roughly sequentially — but tokens (1.1) MUST be done first. Mobile work (Phase 2) can run in parallel with anything once tokens exist.

## Where this plan ends

When all checkboxes above are ticked, MyTerra is ready for the *next* big plan — the native-shipping plan (Capacitor wrapper, App Store, monetization). That plan is parked. Don't touch it until this one is mostly green.

## Cleanup backlog

Surfaced during the 2026-05-11 sync pass and knocked out before Phase 5 work resumed.

- [x] **Delete `src/App.jsx.backup`.** 239 KB stale snapshot, git-tracked. Residue from the Phase 3.11 sandbox mishap noted in ARCHITECTURE_PLAN's decision log (2026-05-11 entry). Removed via `git rm`.
- [x] **Add `output/` and `.playwright-cli/` to `.gitignore`.** Both were untracked Playwright debug artifact dirs (2.2 MB + 216 KB) at repo root. Added under a new "Playwright local artifacts" comment block.
- [x] **Retire `PROGRESS.md`.** Last updated 2026-03-31, still said "Mediterranean/Albanian agriculture focus is non-negotiable" — directly contradicted the 2026-05-05 Western Europe pivot recorded in ARCHITECTURE_PLAN. Removed via `git rm`. Launch/business tracking is parked until we're closer to a real ship date.

## Decision log

| Date | Decision |
|---|---|
| 2026-05-07 | Lane: Notion × Planta hybrid |
| 2026-05-07 | Palette: keep cream + forest, refine tones |
| 2026-05-07 | Icons: Lucide + Twemoji bridge, custom set later |
| 2026-05-07 | This file is the working plan; updates merged via PR |
| 2026-05-07 | Phase 1 complete — tokens in `:root`, C refs CSS vars, type scale exported as `TS`, 3 stray buttons fixed |
| 2026-05-07 | `C.r` / `C.rs` stay numeric — `C.r+4` arithmetic in Overlay means CSS vars would break it |
| 2026-05-07 | ~15 inline pill `<span>` elements deferred to Phase 3.5 (not worth touching before Pill gets tone variants) |
| 2026-05-07 | Phase 2 complete (2.1–2.4, 2.6, 2.7). Deferred: 2.5 swipe gestures, 2.8 real-device testing |
| 2026-05-07 | Phase 3.1–3.2 complete — lucide-react installed, all nav/tabs/drawer use Lucide component refs |
| 2026-05-07 | Phase 3.3 complete — dark mode CSS tokens + JS toggle + localStorage persistence + system-pref detection |
| 2026-05-07 | Phase 3.4 complete — Leaf icon in sidebar brand + AI FAB, Trash2 for delete buttons. Remaining 🌾 are content emoji (intentional). |
| 2026-05-07 | Bug: lucide `Map` import shadows global `Map` constructor after Rolldown minification → fixed as `Map as MapIcon`. Rule: any lucide import matching a JS global MUST be aliased. |
| 2026-05-07 | Bug: `getRegionalCalendar` dropped during Phase A Commit 4 data extraction, never exported from regional-overrides.js → restored to App.jsx before DEF block. |
| 2026-05-07 | Phase 3.5 complete — `Pill` extended with `sm` + `border` props. 14 inline spans replaced across 7 locations. Nav/attention count badges left as-is (different semantic). |
| 2026-05-07 | Phase 4 complete — TodayScreen, FarmTab (Map/Crops/Layout), FarmMapHero, calm greeting, manual link in PlotOverlay, profile avatar in MoreDrawer. |
| 2026-05-07 | `setup` route removed from top-level routing — now lives as "Layout" subtab inside FarmTab. `setPage("farm", {tab:"setup"})` bridges old callers. |
| 2026-05-07 | `setPage` made optional in PlotOverlay — callers without setPage (Farming subtab) silently skip the manual link CTA. No cascading prop drilling needed. |
| 2026-05-07 | `FarmMapHero` zone-render logic is a deliberate duplication from TodayScreen mini-map — acceptable until shared component refactor in Phase 6+. |
| 2026-05-11 | Sync pass against shipped code. **5.3 flipped to done** — three nested rings already shipped at TodayScreen.jsx 154-156; third ring is "Harvest readiness" rather than "Pantry stocked" — kept as shipped, harvest readiness is the more useful daily signal. **5.2 + 5.5 reclassified as partial** — small streak stat and plain log feed exist on Today, but neither matches the full plan (no hero streak, no Streak Freeze, no contextual activity CTAs). **4.4 annotated** with the BOTTOM_TABS "Animals" / NAV "Livestock" name inconsistency — same screen, two labels — to be reconciled in 6.3.1. Cleanup backlog added (App.jsx.backup, gitignore, PROGRESS.md). |
| 2026-05-11 | **6.3.1 + 6.3.2 pulled forward** to resolve the 4.4 mobile/desktop label mismatch in one shot. Renamed "Livestock" → "Animals" across all UI surfaces (sidebar NAV, page header, Projects category, AI assistant strings) and refreshed FeedbackSurvey's obsolete module list end-to-end. Sidebar icon swapped `Rabbit` → `PawPrint` to match the mobile bottom tab; `Rabbit` import dropped. Internal names (`Livestock` component, `"live"` route id, data files, "Livestock:" sub-tip inside Perimeter Fencing method content) intentionally left as-is — scope limited to user-facing UI labels. Bundle clean: zero "Livestock" matches for UI/nav strings; 18 "Animals" matches present. |
