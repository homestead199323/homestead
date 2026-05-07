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

- [ ] **2.1 Real breakpoints.** 0–479 phone, 480–767 phablet, 768–1023 tablet, 1024+ desktop. Each gets a dedicated layout.
- [ ] **2.2 Bottom-tab navigation on mobile.** Five tabs: **Today / Farm / Animals / Pantry / More.** "More" holds Calendar, Financials, Manuals, Settings. Sidebar collapses to this on phone, becomes a rail on tablet, stays as today on desktop.
- [ ] **2.3 Stack-first layout on phone.** All grids collapse to single column. KPI hero card on top, smaller secondary tiles below.
- [ ] **2.4 Bottom sheets for detail views.** Tapping a crop, animal, or task opens a slide-up sheet — not a centered modal, not a route change.
- [ ] **2.5 Swipe gestures on lists.** Swipe-right to mark done. Swipe-left to delete with red reveal. Pull-to-refresh on Today and Tasks.
- [ ] **2.6 Touch targets 44px buttons / 56px+ rows and gesture areas.**
- [ ] **2.7 Safe-area + viewport correctness.** `viewport-fit=cover`, `env(safe-area-inset-*)` everywhere.
- [ ] **2.8 Real-device testing.** iPhone SE 2020, iPhone 14+, Pixel 6a, iPad Mini.


## Phase 3 — Visual identity and design system

- [ ] **3.1 Icons: Lucide React + Twemoji-as-SVG bridge.** Lucide for UI chrome (nav, buttons, badges). Twemoji SVG (MIT-licensed, identical render across OS) for crops/animals/celebrations. Replace all OS emoji in headers and primary content. Keep emoji *literal characters* only at celebration moments (achievement unlock, harvest done).
- [ ] **3.2 Iconography rule of thumb.** Custom/Lucide icon for navigation and primary identity. Twemoji for content (crops, animals). Native emoji ONLY for celebration moments. Three tiers, one rule each.
- [ ] **3.3 Dark mode.** Build it now while tokenizing. System-preference aware, manual override in Settings. Designed surface — not an inversion.
- [ ] **3.4 Lucide icon swap pass.** Sidebar/nav, all action buttons, FAB (replace 🌾 with chat-bubble-with-sprout or similar). The Livestock sidebar icon (currently goat) replaced with a generic Lucide farm icon.
- [ ] **3.5 Pill/badge consolidation.** Merge "Done" / "Active" / "Easy" / "Full" / "Every 3 days" into one Pill component with tone variants.

## Phase 4 — Information architecture rethink

- [ ] **4.1 Today replaces Dashboard.** Renamed and redesigned. Action-first, not data-aggregator-first.
- [ ] **4.2 Calm-default greeting.** Replace "8 urgent" red wall with "Three things on your walk today" or "A quiet day — one watering."
- [ ] **4.3 Farm map promoted to hero on Farm tab.** Currently a half-screen tile inside dashboard. Promote to be the hero of Farm tab. Tapping a zone opens a bottom sheet with that zone's plants, tasks, stats.
- [ ] **4.4 Module consolidation.** "Farming" and "Farm Layout" merge into one tab — **Farm**. Top-tab segmented control inside: **Map / Crops / Setup**.
- [ ] **4.5 Manuals integrated into context.** Surface manual content inline ("Need help with tomatoes?" link inside crop detail). Keep Manuals tab for browsing.
- [ ] **4.6 Settings out of the way.** Tucked behind a profile avatar in More.


## Phase 5 — Today screen (the daily habit loop)

This screen is 80% of why someone keeps using MyTerra.

- [ ] **5.1 Hero block.** Greeting + date + weather snippet ("Cool and cloudy in London — good for transplanting"). Wire OpenWeather API.
- [ ] **5.2 Streak module.** Hero size, Duolingo-flame energy. Current streak number + week-strip showing last 7 days. Streak Freeze earned weekly to forgive one missed day.
- [ ] **5.3 Three rings.** Apple Fitness pattern. Tasks done / Plants growing / Pantry stocked. Tap a ring → drill in.
- [ ] **5.4 "Start your walk" CTA.** Single primary button. Launches guided sequence — one task per screen, swipe-up to complete, soft chime, end-of-walk summary card.
- [ ] **5.5 Recent activity feed.** "Yesterday you harvested 4kg mint — preserve some?" with one-tap shortcut to the right Pantry workflow.
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
- [ ] **6.3.1** Rename "Livestock" to "Animals" — friendlier for novices.
- [ ] **6.3.2** Resolve sidebar icon mismatch (currently goat, content is chickens).
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

| Week | Focus |
|---|---|
| 1 | Phase 1 (tokenize, type, components) + Phase 3.1–3.2 (Lucide+Twemoji swap) |
| 2 | Phase 2 (mobile breakpoints + bottom-tab nav + stack layouts) |
| 3 | Phase 3.3–3.5 (dark mode, icon swap pass, pill consolidation) |
| 4 | Phase 4 + Phase 5 (IA rethink + Today screen redesign) |
| 5 | Phase 6 (module-by-module fixes) |
| 6 | Phase 8 (motion polish) |
| 7 | Phase 7 + Phase 9 + Phase 10 (onboarding + microcopy + a11y) |

Phases run roughly sequentially — but tokens (1.1) MUST be done first. Mobile work (Phase 2) can run in parallel with anything once tokens exist.

## Where this plan ends

When all checkboxes above are ticked, MyTerra is ready for the *next* big plan — the native-shipping plan (Capacitor wrapper, App Store, monetization). That plan is parked. Don't touch it until this one is mostly green.

## Decision log

| Date | Decision |
|---|---|
| 2026-05-07 | Lane: Notion × Planta hybrid |
| 2026-05-07 | Palette: keep cream + forest, refine tones |
| 2026-05-07 | Icons: Lucide + Twemoji bridge, custom set later |
| 2026-05-07 | This file is the working plan; updates merged via PR |
