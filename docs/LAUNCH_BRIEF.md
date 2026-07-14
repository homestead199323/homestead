# MyTerra Public Launch Transformation Brief

> **Canonical copy — persisted 2026-07-14 so every future session can read it from the repo
> instead of re-pasting.** Execution status lives in `LAUNCH_PLAN.md` (repo root).
>
> **OVERRIDES (Dervis, 2026-07-14) — these supersede the brief where they conflict:**
> 1. Pricing stays as shipped: Basic $4.99/mo, Pro $9.99/mo, Lifetime $190 via Paddle.
>    Section 12's €6.99/€59.99/€99–129 plan structure is REJECTED.
> 2. Trial: 7-day Pro trial → paywall. No permanent free plan (matches brief).
> 3. Staged implementation per LAUNCH_PLAN.md, one stage per Full-ship cycle.

---

You are working on MyTerra, a responsive, offline-first growing and small-farm management web application. The product is being prepared for public launch.

The objective is not to add more agricultural content or more standalone modules. The objective is to make the existing product:

* Easier to understand
* Faster to configure
* More visually compelling
* More personalised
* More useful immediately
* More likely to convert after the seven-day trial
* More shareable
* More attractive to technology-oriented millennials

Do not redesign the product from scratch. Do not remove existing core functionality. Do not make the visual map optional.

The visual map is the central feature and primary differentiator of MyTerra.

---

## 1. Target audience

The primary user is a technology-comfortable millennial who:

* Has a balcony, backyard, garden, allotment, smallholding, or small farm
* Wants to grow food or become more self-sufficient
* May be starting from zero
* May already be growing crops or keeping animals
* Finds farming and gardening intimidating or difficult to organise
* Likes visual, interactive, game-like digital experiences
* Wants practical instructions rather than professional agricultural software
* Wants the satisfaction of building and watching a digital version of their real growing space
* Wants the app to tell them what needs attention next

The product must work equally well for: a user with six balcony pots, a small suburban backyard, several garden beds, an allotment, or a small farm or homestead.

The interface must not assume that every user owns a traditional farm.

## 2. Core product promise

MyTerra should communicate and deliver:

> Build a living digital version of your growing space, then let MyTerra guide you through what to plant, what to do, and what comes next.

Supporting message:

> From a balcony to a small farm, MyTerra turns your real space into a personalised growing plan with practical tasks, seasonal guidance, and visible progress.

The product should feel like a combination of: a visual digital twin of the user's growing space, a personal growing coach, a seasonal planner, a practical task manager, and a progress-tracking game.

It should not feel like an agricultural ERP system.

## 3. Core product principles

1. Every user must build a visual map.
2. The map must adapt to the type of space selected during onboarding.
3. The map must resemble the user's real environment as closely as reasonably possible.
4. A new user must receive a useful personalised setup within a few minutes.
5. The Today screen must clearly explain what requires attention.
6. Onboarding answers must materially alter recommendations, task logic, interface defaults, and map behaviour.
7. Suggested starter plants must remain editable.
8. Users must never be locked into a preset planting plan.
9. Every user must have access to all five main navigation areas.
10. The seven-day Pro trial remains the primary acquisition model.
11. Do not create a permanent free plan.
12. Do not create a Beginner Mode.
13. Do not add new farming modules before launch.
14. Preserve offline-first functionality.
15. Preserve compatibility with existing users and existing stored data.
16. Avoid manipulative or misleading conversion design.
17. Demonstrate value during the trial before presenting payment.
18. Do not redesign the same feature repeatedly without a functional reason.

## 4. Phase 1: inspect the codebase

Before modifying files:

1. Identify the framework and routing architecture.
2. Identify the authentication system.
3. Identify the database and storage architecture.
4. Identify the offline-storage mechanism.
5. Identify the service-worker implementation.
6. Identify the current onboarding flow.
7. Identify how user profiles and preferences are stored.
8. Identify how maps, zones, assets, crops, animals, and structures are represented.
9. Identify how tasks are generated, scheduled, repeated, completed, postponed, and dismissed.
10. Identify how weather and climate data affect recommendations.
11. Identify how the crop database is structured.
12. Identify how subscriptions, trials, and feature gating work.
13. Identify analytics currently in use.
14. Identify all components that assume a conventional farm.
15. Identify all map components that are hard-coded for one environment.
16. Identify database migration risks.
17. Identify existing-user compatibility risks.
18. Identify mobile, tablet, and desktop layout limitations.
19. Produce a concise architecture report.
20. Produce a file-by-file implementation plan before coding.

Do not begin a broad visual rewrite before understanding the current architecture.

## 5. Phase 2: redesign onboarding

Create a multi-step onboarding process that produces a personalised map, planting suggestion, and initial task plan. Each answer must be saved and actively used by the application. The onboarding must not collect information that is ignored later.

### Step 1: choose the environment

Ask: **What kind of growing space are you creating?**

Options: **Balcony · Backyard · Farm** — the three primary map environments.

**Balcony** — the app should:
* Load the Balcony map environment; use a smaller default scale
* Prioritise containers, pots, vertical planters, railing planters, shelves, and compact beds
* Avoid recommending crops requiring large permanent areas unless requested
* Prioritise container-compatible crops: herbs, leafy greens, compact vegetables, dwarf varieties, strawberries, suitable climbers
* Ask about sunlight direction and hours; floor dimensions; wind exposure; whether the balcony is covered; access to water
* Adjust watering frequency for containers; account for faster soil drying
* Reduce assumptions about livestock, orchards, and large structures
* Keep all navigation available despite the smaller environment

**Backyard** — the app should:
* Load the Backyard map environment
* Support grass, soil, patios, fences, walls, sheds, beds, containers, trees, and compact structures
* Ask for total usable dimensions; how much space should remain recreational; children or pets where relevant to layout safety; existing trees and permanent structures
* Support raised beds, vegetable plots, herbs, composting, small greenhouses, and limited livestock
* Recommend a mix of productive and aesthetic planting; balance growing areas with pathways and leisure areas
* Adjust tasks based on soil beds versus containers

**Farm** — the app should:
* Load the Farm map environment; support larger dimensions and more zones
* Support fields, orchards, livestock, greenhouses, storage, water systems, paths, utility areas, structures
* Ask about acreage or square metres; existing crops and animals; water access; field orientation; slope where relevant; production goals; commercial versus household use
* Allow more detailed operational and financial tracking
* Support larger task volumes and recurring maintenance cycles

### Step 2: define dimensions

Ask the user to enter approximate dimensions.

* **Balcony:** length, width, optional irregular shape, wall positions, door position, railing position, covered/uncovered status.
* **Backyard:** length, width, optional irregular boundary, house-facing side, existing patio or paved section, existing structures, existing trees, entrance position.
* **Farm:** total area, approximate boundary dimensions, optional irregular boundary drawing, main access point, existing buildings, water point, existing permanent zones.

Include: metric and imperial units, an "I am not sure" option, easy dimension editing later, clear visual scale feedback.

Dimensions must affect: map proportions, available placement area, object scale, recommended quantity of plants, suggested number and size of beds, spacing validation, path recommendations, estimated crop capacity, watering workload, time estimates, suitability warnings, suggested layouts, estimated potential harvest.

Do not use dimensions only for visual decoration.

### Step 3: location and climate

Ask for: country; city, region, or postcode; optional precise location permission; elevation where available automatically.

Explain that location is used to calculate: climate region, current season, typical frost dates, day length, weather, planting windows, watering recommendations, heat and cold risks.

Location must affect: recommended crops, planting dates, harvest estimates, weather-sensitive tasks, frost alerts, heat alerts, seasonal calendar, irrigation recommendations, greenhouse advice, crop warnings, task timing, suggested varieties where supported.

When precise local data is unavailable, clearly communicate that recommendations are approximate.

### Step 4: sunlight

Ask: **How much direct sunlight does your space receive?**

Options: Less than 3 hours · 3–5 hours · 5–7 hours · More than 7 hours · I am not sure.

Where possible, ask the user to identify which side receives morning or afternoon sun. For Balcony and Backyard maps, allow sunlight direction to be displayed visually.

Sunlight must affect: recommended crops, placement suggestions, shade-tolerant plant suggestions, warnings for unsuitable plant placement, map overlays, greenhouse placement suggestions, watering estimates, growth and harvest estimates.

The system should not recommend full-sun crops as primary suggestions in heavily shaded spaces without an explanation.

### Step 5: user objective

Ask: **What do you want MyTerra to help you achieve?** (multiple selections)

* Start growing food from zero
* Decide what to plant
* Manage plants I already have
* Produce food for my household
* Become more self-sufficient
* Improve my garden layout
* Keep animals
* Track harvests
* Preserve food
* Understand costs
* Run a small productive farm

Selected goals must affect: initial recommendations, dashboard emphasis, suggested task categories, suggested map zones, starter plant suggestions, progress metrics, achievement types, learning content, notification priorities, default reports.

Examples: a self-sufficiency goal emphasises household food production and meals supplied; a layout goal emphasises map planning, spacing, zone organisation; a household production goal prioritises productive crops over ornamental elements; a cost-tracking goal surfaces financial entry prompts more prominently; a preservation goal connects harvest projections to preservation guidance.

All navigation must still remain accessible.

### Step 6: experience level

Ask: **How experienced are you?**

Options: Complete beginner · I have grown a few things · Confident gardener · Experienced farmer or homesteader.

Do not create separate app modes. Experience level should affect presentation depth, not feature access.

* **Complete beginner:** simpler explanations, more detailed task instructions, explain terminology, fewer initial crops, stronger placement guidance, more warnings, tasks broken into smaller steps, no assumed prior knowledge.
* **Some experience:** moderate detail, broader crop suggestions, fewer basic explanations, practical reminders retained.
* **Confident gardener:** more technical detail by default, crop succession and rotation suggested earlier, more crops in initial setup, fewer explanatory interruptions.
* **Experienced farmer or homesteader:** operational details more prominent, larger initial setups, financials/livestock/preservation/productivity analytics surfaced earlier, concise task instructions unless expanded.

All users must have access to all navigation and all eligible trial features.

### Step 7: available time

Ask: **How much time can you normally spend?**

Options: Around 5 minutes a day · Around 15 minutes a day · A few hours each week · Regular daily work · As much as needed.

Available time must affect: number of recommended starting plants, crop-maintenance intensity, suggested garden size, daily task volume, weekly task grouping, recommended irrigation automation, crop suitability, notifications, estimated workload warnings, starter suggestions.

Examples: a five-minute user gets lower-maintenance plants and a smaller suggested setup; a weekend user gets grouped Saturday/Sunday task plans; a daily user may get more frequent monitoring tasks; a farm user with regular daily availability can get broader operational plans.

The app should warn users when their selected setup is likely to exceed their stated available time.

### Step 8: household and production needs

Ask: number of people in the household; whether food production is personal, family, community, or commercial; preferred types of food; crops they dislike; dietary preferences where relevant.

Optional preferences: herbs, salads, tomatoes and summer vegetables, cooking vegetables, fruit, preserving crops, high-yield staples, child-friendly plants, pollinator-friendly plants.

This information must affect: suggested plant quantities, crop categories, expected household contribution, meal-based progress estimates, harvest targets, preservation suggestions, plant recommendations, rejected crop filtering.

Do not recommend crops the user explicitly excluded.

### Step 9: current assets

Ask: **What do you already have?**

Depending on environment, allow users to add: pots, planters, raised beds, soil beds, greenhouse, compost, water source, irrigation, existing trees, existing crops, shed, coop, livestock area, storage, other structures.

Existing assets must: appear on the initial map, reduce duplicate recommendations, affect layout suggestions, affect task generation, affect watering and maintenance plans, affect available plant capacity, affect recommended purchases, affect infrastructure tasks.

### Step 10: plant suggestions

Generate a personalised list of suggested starter plants based on: environment, dimensions, climate, current month, sunlight, experience, available time, household size, user goals, existing assets, stated crop preferences.

The plan must be suggestive, not preset. For every suggested plant, allow: select, unselect, replace, change quantity, view why it was suggested, view maintenance level, view expected planting and harvest timing.

Include: recommended plants, optional additions, plants not recommended now, crops to consider in a future season.

The user must actively confirm the plants before they are added. Do not automatically populate the map with crops the user did not approve.

### Step 11: generate the initial map

Generate a starting map based on: selected environment, dimensions, existing structures, sunlight, selected crops, spacing requirements, water access, paths, user goals.

The generated map is a starting recommendation. The user must be able to: move objects, resize zones, rotate zones, delete zones, add zones, change crops, change quantities, modify dimensions, edit the boundary, change the visual environment later.

The initial map should feel complete enough to create excitement, while remaining fully editable.

### Step 12: initial seven-day plan

After map confirmation, generate: first action for today, seven-day setup plan, initial planting or preparation tasks, material requirements, estimated time per task, weather-sensitive actions, expected first milestone, expected first harvest range where applicable.

The user must finish onboarding on a populated Today screen. Do not end onboarding on an empty dashboard.

## 6. Phase 3: create three distinct map environments

Build exactly three primary visual map environments: **Balcony**, **Backyard**, **Farm**.

Each environment must share the same underlying data model where possible but have clearly different visual behaviour. Do not create three disconnected applications.

### Balcony environment

Should visually resemble a real residential balcony or terrace.

**Visual characteristics** — configurable elements such as: balcony flooring; tile, concrete, stone, or decking textures; railings; walls; apartment-facing wall; door or window; corners; shelving; vertical growing structures; pots; planters; hanging planters; railing planters; small furniture; watering can; compact storage.

**Animations** — restrained, realistic: leaves moving gently in the wind, hanging plants moving slightly, changing daylight, soft shadows changing with time, rain effects when relevant, subtle watering animation, new growth appearing over time, harvest-ready indicators, seasonal visual changes. Avoid excessive cartoon motion.

**Functional differences:** smaller object increments, container-based capacity, vertical-space support, sun-direction overlay, weight or overcrowding warnings where appropriate, container drainage considerations, faster soil-drying logic, compact crop recommendations.

### Backyard environment

Should resemble a real residential garden.

**Visual characteristics:** grass, soil, fence, wall, patio, house edge, garden entrance, trees, raised beds, ground beds, paths, compost, shed, small greenhouse, seating area, water point, decorative planting.

**Animations:** grass and plant movement, tree movement, birds or pollinators used sparingly, weather transitions, daylight and shadow changes, irrigation or watering effects, crop growth stages, seasonal colour changes, harvest effects, compost activity indicators.

**Functional differences:** balance productive and recreational space, support soil beds and containers, allow permanent trees and structures, support pet- or child-safe pathway planning, support crop rotation, support compact livestock where enabled, support lawn and non-growing areas.

### Farm environment

Should resemble a real small farm or homestead.

**Visual characteristics:** larger land area, fields, vegetable zones, orchard, greenhouses, barn or storage, coop, livestock areas, fencing, roads and paths, water points, irrigation zones, compost, utility areas, house footprint, terrain variation where supported.

**Animations:** crop movement, tree movement, livestock movement within defined areas, irrigation effects, weather transitions, day and night cycle cues, seasonal field changes, growth stages, harvest-ready indicators, greenhouse activity, farm equipment movement used only where meaningful.

**Functional differences:** larger dimensions, multi-zone planning, livestock capacity, water and irrigation planning, field-level task grouping, orchard management, infrastructure maintenance, higher task volume, labour and cost tracking, larger harvest and storage workflows.

## 7. Map realism requirements

The map must resemble real life as much as possible without becoming visually confusing or computationally expensive.

**Prioritise:** correct relative scale, realistic spacing, environment-specific objects, seasonal appearance, growth stages, sunlight and shadow, weather effects, path access, water access, plant maturity differences, realistic object proportions.

**Avoid:** random decorative clutter; objects that do not affect the user's setup; crops placed at impossible densities; structures with no access path; greenhouses or beds that exceed the available area; visual effects that make editing difficult; animations that reduce performance; farm elements appearing on balcony maps; large rural scenery surrounding a small urban balcony.

The editable map must remain usable on a phone. Add performance fallbacks for low-powered devices. Respect reduced-motion settings.

## 8. Phase 4: rebuild navigation

Use the same main navigation for every user:

1. **Today** 2. **My Space** 3. **Plan** 4. **Learn** 5. **Progress**

Do not hide navigation based on environment, experience, or user type. Content within each section may be prioritised based on onboarding answers, but all sections remain available.

**Today** — the operational home screen. Include: high-priority tasks, quick tasks, weather context, upcoming work, current map status, plants requiring attention, animals requiring attention, progress toward next milestone, trial status during the trial period.

The Today screen must answer: What should I do? Why should I do it? How long will it take? Where on my map does it apply? What happens if I postpone it? How do I complete it? Selecting a task should highlight the relevant location on the map.

**My Space** — include: full visual map, crops, plants, animals, beds, pots, zones, structures, infrastructure, map-editing controls, environment settings, dimension settings. Users move between a visual map view and an organised inventory view. The map remains central.

**Plan** — include: suggested starter plants, seasonal calendar, what to plant now, future planting, crop succession, crop rotation, space-capacity suggestions, household production goals, infrastructure plans, planting scenarios. All plans remain editable. Recommendations must explain why they were generated.

**Learn** — include: crop guides, animal guides, preservation guides, DIY manuals, search, contextual learning linked from tasks, safety information, regional notes, sources or methodology where available. Learning content accessible from map objects and tasks.

**Progress** — include: harvests, pantry, financials, achievements, statistics, food produced, estimated meals supplied, crop-cycle progress, cost and value, historical map or seasonal timeline where feasible. All users can access this section. Empty states should explain how data will begin appearing.

## 9. Phase 5: improve task generation and task cards

Every task must include: title; relevant plant, animal, structure, or zone; map location; estimated duration; priority; reason; instructions; weather context where relevant; completion option; postponement option; skip option; already-completed option; not-relevant option; user note; optional deeper explanation.

Tasks must use onboarding information.

**Task logic inputs:** environment type, map dimensions, crop, variety where available, planting date, growth stage, climate, current weather, recent weather, sun exposure, soil or container type, irrigation access, user experience, available time, user feedback, previous task completion, crop condition notes, animal count, infrastructure present.

Do not generate identical task frequency for a balcony container and an open farm bed.

**Example task:**

> **Check the soil moisture of your balcony tomatoes** — Estimated time: 2 minutes
>
> Your tomato containers are exposed to afternoon sun, and no rain can reach the covered balcony. They were last watered two days ago.
>
> Push your finger approximately 3 cm into the soil: Dry → water until excess begins draining. Slightly moist → check again tomorrow. Wet → do not water.
>
> Actions: Watered · Soil is still moist · Remind me tomorrow · Already completed · This task is not relevant.
> Map action: highlight the relevant tomato containers.

The selected response should influence future task scheduling where technically possible.

## 10. Phase 6: suggested starter plants

Create a personalised suggestion engine rather than rigid presets. The app may internally use starter-plan patterns, but users must experience them as flexible recommendations.

Suggestion categories may include: balcony essentials, low-maintenance garden, small-space high-yield crops, family vegetable garden, weekend-maintenance garden, preserving garden, Mediterranean garden, cool-climate garden, raised-bed rotation, small homestead mix. Do not force users into a named template.

For every suggestion, display: why it suits the user, required space, sun requirement, maintenance level, approximate time to harvest, suitable planting period, suggested quantity, compatible plants, potential concerns.

Allow users to: accept all, accept selected plants, reject plants, replace plants, change quantities, save plants for a later season, search and add their own plants. The map should update as selections change.

## 11. Phase 7: progress and gamification

Retain game-like satisfaction but make progress connected to real outcomes. Do not rely mainly on daily login streaks.

Use milestones such as: first map created, first zone created, first crop selected, first plant added, first task completed, first week completed, first seed planted, first transplant, first harvest, first kilogram harvested, first meal grown, first crop cycle completed, first preserved product, first season completed, first financial record, first animal-care cycle completed.

Show progress messages such as: "Three steps until your first planting day" · "Your balcony is 70% configured" · "Four of five essential tasks completed this week" · "Your garden has produced ingredients for approximately six meals" · "Your tomatoes are approaching the flowering stage" · "Your farm generated an estimated value of €85 this month".

Missed days should not use shame-based messaging. Use visual progression on the map where possible.

## 12. Phase 8: seven-day trial and subscription conversion

> **OVERRIDE: pricing/tier prescriptions in this section are superseded — see header.
> Live tiers: Basic $4.99/mo, Pro $9.99/mo, Lifetime $190 (Paddle). Trial + no-free-plan
> principles below still apply.**

Do not implement a permanent free plan. Every new user receives a seven-day Pro trial. The trial should begin only after account creation.

Clearly communicate: trial duration, trial start date, trial end date, what will happen at expiration, price after trial, whether payment details are required, whether the user will be charged automatically. Do not hide trial conditions.

**Trial activation strategy** — guide the user through meaningful activation:

* **Day 0:** complete onboarding, generate environment-specific map, confirm suggested plants, complete first map edit, receive first task.
* **Day 1:** complete first practical task, view weather-adjusted advice, see map object highlighted through a task.
* **Day 2:** add or modify a plant or zone, view a contextual guide.
* **Day 3:** review the seven-day plan, complete a second meaningful action, see progress update.
* **Day 4:** record an observation, receive an adjusted recommendation.
* **Day 5:** view seasonal planning, review upcoming planting or care needs.
* **Day 6:** receive trial-value summary — show configured map, plants, tasks, plans, expected milestones.
* **Day 7:** present subscription choice; clearly explain what remains available or becomes read-only after expiration; preserve all user data; do not delete the map or user records.

The conversion message should focus on retained value: continue receiving personalised tasks, continue updating the living map, keep seasonal recommendations active, continue tracking progress, preserve ongoing plans and records.

Do not rely solely on the user's time investment as the reason to purchase. The product must demonstrate practical value before the paywall.

[Original plan-structure suggestion (Monthly €6.99 / Annual €59.99 / Founding lifetime €99–129) — REJECTED per override. Kept for the record only.]

## 13. Phase 9: sharing and viral mechanics

Build sharing around the visual map and real progress.

Create shareable cards for: my balcony growing plan, my backyard setup, my farm layout, what I am planting this month, my first harvest, total kilograms harvested, estimated meals grown, seasonal progress, before-and-after map progression, self-sufficiency progress, my seven-day growing plan.

Each card should include: user-selected map view, environment-specific visuals, selected plants, progress metric, optional MyTerra branding, optional referral link, privacy controls, no exact location by default, no financial information by default.

Support: native browser sharing, download as image, common social dimensions, mobile-friendly preview.

**Referral foundation** — track: referral link opened, account created, onboarding completed, map created, trial activated, subscription completed.

Potential reward: referrer receives additional Pro time after the referred user becomes a paying subscriber; referred user receives an extended trial or introductory discount. Do not grant rewards for clicks alone.

If the full referral-credit system is too large, implement the referral data model and attribution tracking first.

## 14. Phase 10: homepage changes

Update the homepage to reflect all three target environments.

* **Hero headline:** Grow food without the guesswork.
* **Supporting text:** Build a living digital version of your balcony, backyard, or farm. MyTerra helps you choose what to grow, organise your space, and know what to do next.
* **Primary CTA:** Build my growing space
* **Trust line:** No farming experience required. Start with a seven-day Pro trial.

**Product demonstration** — visually demonstrate the three environments with an interactive or animated comparison: Balcony (compact urban balcony with pots, railing planters, herbs, tomatoes), Backyard (residential garden with raised beds, lawn, paths, greenhouse), Farm (larger productive landscape with fields, orchard, animals, structures). Users should immediately understand that the application adapts to their real space.

**Content order:** 1. Hero and CTA · 2. Three environment options · 3. Interactive map demonstration · 4. How onboarding creates a personalised setup · 5. Example personalised Today tasks · 6. Suggested plants and seasonal planning · 7. Growth and progress tracking · 8. Offline and data ownership · 9. Trial explanation · 10. Pricing · 11. Founder story · 12. FAQ · 13. Final CTA.

Reduce long feature lists that do not demonstrate outcomes.

**Claims and credibility** — remove or revise claims that cannot be substantiated. Do not imply: guaranteed crop success, fully autonomous farm management, perfect local climate accuracy, professional agricultural certification, use on a specific real farm unless true, livestock routines the founder does not currently perform, scientific validation that has not occurred, real-user adoption figures that are not verified.

Explain clearly: how recommendations are generated, what weather data is used, what regional limitations exist, that agricultural results vary, that users should use judgement for high-risk decisions.

## 15. Analytics events

Add privacy-conscious analytics for:

* **Acquisition:** landing page viewed, environment option selected, primary CTA clicked, pricing viewed, trial CTA clicked.
* **Account and onboarding:** sign-up started/completed; onboarding started; each onboarding step completed/abandoned; environment selected; dimensions entered; location completed; plant suggestions generated/accepted/rejected; initial map generated/edited; onboarding completed.
* **Activation:** first crop added, first zone added, first task viewed, first task completed, first weather recommendation viewed, first guide opened, first observation recorded, first progress milestone reached.
* **Map behaviour:** map opened, object moved, object resized, object rotated, boundary edited, environment changed, map setup abandoned, map share initiated.
* **Retention:** day-one/day-three/day-seven return, task completion rate, dismissed task rate, notification opened, weekly active user.
* **Subscription:** trial started, trial reminder viewed, trial summary viewed, upgrade screen viewed, monthly/annual/lifetime plan selected, checkout initiated/completed/abandoned, trial expired, subscription cancelled.
* **Sharing:** share card created, share initiated, share completed where detectable, referral link opened, referred sign-up completed, referred onboarding completed, referred subscription completed.

Do NOT send: exact location, personal notes, financial values, crop-health notes, animal-health notes, private map labels, personal household information — unless explicitly anonymised and necessary.

## 16. Accessibility requirements

Remove `user-scalable=no`; remove restrictive `maximum-scale`; permit browser zoom; add keyboard navigation; add visible focus states; add accessible labels; ensure adequate touch-target sizes; ensure text contrast; support screen readers; respect reduced-motion settings; provide reduced-animation map mode; avoid placing essential information only in colour; add text alternatives for map statuses; ensure all map actions have accessible alternatives; support users unable to drag objects precisely.

The map is mandatory as a product feature, but it must still be operable through accessible controls.

## 17. Technical requirements

Preserve: service-worker functionality, offline data, authentication, subscription state. Prevent data loss during migrations.

Add tests for: database migration, map-state migration, onboarding, task generation, task completion, trial state, subscription gating, responsive layout, accessibility. Test phone, tablet, desktop, and low-powered mobile devices.

Optimise animation performance; lazy-load environment-specific assets; avoid loading Farm assets for Balcony users unnecessarily; add fallbacks for unsupported graphics features; ensure environment animations stop when the tab is inactive; ensure offline map editing syncs correctly when connection returns.

Review forced portrait orientation. Do not force portrait mode unless a specific map interaction absolutely requires it.

## 18. Existing-user migration

Existing users must not lose: map data, crops, animals, tasks, harvests, pantry data, financial data, notes, subscription status, trial status, account settings.

Map existing farms into the new Farm environment by default. Allow existing users to change their environment manually. Do not restart trials. Do not overwrite existing map boundaries. Do not regenerate existing layouts without confirmation.

## 19. Scope freeze

Do not work on the following before the launch requirements are complete: additional crop-database expansion, additional animals, additional preservation methods, additional DIY guides, a fourth map environment, decorative map themes, multiplayer, community feed, marketplace, equipment sales, social messaging, complex commercial-farm accounting, new unrelated modules, full design-system rewrite, repeated visual redesign of completed map assets.

The only acceptable pre-launch map work is work required to: support Balcony, Backyard, and Farm environments; improve realism; improve editing; improve onboarding integration; improve performance; fix functional problems; improve accessibility.

## 20. Implementation sequence

* **Stage 1 — architecture:** inspect repo, document architecture, identify migration risks, map limitations, task-generation limitations, file-by-file plan.
* **Stage 2 — data model:** environment type, onboarding-preference fields, dimension/environmental inputs, suggestion-selection state, experience/time preferences, migration logic, analytics event structure.
* **Stage 3 — onboarding:** build steps, connect every answer to logic, personalised plant suggestions, initial environment map, initial seven-day plan, finish on Today.
* **Stage 4 — maps:** build Balcony, build Backyard, adapt current map into Farm, dimension editing, environment-specific objects and animations, realistic scale and spacing, performance, reduced-motion, accessible editing controls.
* **Stage 5 — navigation:** implement Today, My Space, Plan, Learn, Progress; reorganise existing modules without deleting data.
* **Stage 6 — tasks:** upgrade task schema, map-location references, reasoning and instructions, contextual completion responses, connect responses to future scheduling, weather and environment logic.
* **Stage 7 — trial and billing:** verify seven-day trial, trial progress, expiration behaviour, clear subscription messaging, preserve data after expiration, test checkout and entitlement states.
* **Stage 8 — sharing:** environment-specific share cards, map sharing, native sharing, referral attribution, analytics.
* **Stage 9 — homepage:** update positioning, show all three environments, demonstrate map adaptation, explain personalisation, clarify trial and pricing, remove unsupported claims.
* **Stage 10 — verification:** type checking, linting, unit tests, migration tests, build, onboarding e2e, each map environment, offline behaviour, subscription expiration, mobile editing, accessibility; fix all blocking issues.

## 21. Required implementation output

Before coding, provide: architecture summary; current onboarding, map-architecture, and task-generation assessments; database migration plan; file-by-file implementation plan; major risks; features reusable / requiring refactoring / requiring new implementation.

After implementation, provide: files changed, database migrations created, new components created, existing components refactored, tests added, build/type-check/lint results, end-to-end verification result, known remaining issues, deferred work, recommended launch checklist.

Do not stop after providing recommendations. Implement the work in controlled stages. Do not expand the scope beyond this brief.

## 22. Launch blockers

The product is ready for launch when:

* All three map environments work
* Dimensions can be configured and edited
* Onboarding answers affect actual app logic
* Plant suggestions are personalised and editable
* The initial map is generated successfully
* The initial seven-day plan is generated successfully
* Today contains meaningful tasks
* All five navigation areas work
* Trial timing works correctly
* Subscription conversion works correctly
* User data survives trial expiration
* Existing users retain their data
* Offline sync works
* No authentication-blocking errors remain
* No data-loss bugs remain
* No payment-blocking errors remain
* No onboarding-blocking errors remain
* Mobile map interaction is usable
* Accessibility blockers are resolved
* Unsupported marketing claims are removed

**Not launch blockers:** more decorative map objects, more crops, more animals, more guides, more elaborate animations, perfect localisation for every country, every agricultural scenario supported, every user request anticipated.

## Final product direction

MyTerra's core differentiator is the living map. The map must not be reduced to decoration. It should function as: the user's digital growing-space twin, the location system for tasks, the planning surface, the visual record of progress, the foundation of shareable content, the emotional connection between the user and the product.

A Balcony user should feel that they are managing their real balcony. A Backyard user should feel that the map represents their actual garden. A Farm user should feel that the app understands the scale and structure of their property.

The public launch version does not need to solve every agricultural problem. It needs to let users build a recognisable version of their real space, receive credible recommendations, understand what to do next, and feel motivated to return.
