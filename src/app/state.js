/* ═══════════════════════════════════════════
   DEFAULT STATE
   The initial shape of the farm-data object. Used both as the seed
   for first-time users (no localStorage yet) and as the fallback
   when stored data is corrupt or migrations throw.
   ═══════════════════════════════════════════ */

export const DEF = {schemaVersion:7,zones:[],garden:{plots:[]},livestock:{animals:[]},pantry:{items:[]},costs:{items:[]},log:[],setupDone:false,region:"western_europe",city:"",
  // Daily task completions — keyed by local YYYY-MM-DD, value is array of task keys
  // completed on that day. Auto-pruned to last 30 days on migration.
  completions: {},
  // Onboarding profile — every field is written by onboarding and consumed by
  // suggestion/task/map logic. environment: 'balcony' | 'backyard' | 'farm'.
  // null environment = onboarding not completed yet (new user pre-onboarding).
  // Existing pre-launch users are migrated to 'farm' (see migrateProfile).
  profile: {
    environment: null,
    dimensions: { lengthM: null, widthM: null, areaM2: null, unit: "metric", covered: null },
    sunlight: null,        // "lt3" | "3to5" | "5to7" | "gt7" | "unsure"
    sunDirection: null,    // "morning" | "afternoon" | "allday" | null
    goals: [],             // multi-select ids, see Onboarding step 5
    experience: null,      // "beginner" | "some" | "confident" | "expert"
    timeBudget: null,      // "min5" | "min15" | "weekly" | "daily" | "unlimited"
    household: { people: null, use: null, likes: [], dislikes: [] },
    onboardingVersion: 0,  // 0 = legacy 4-step flow, 2 = launch 12-step flow
  },
  // Gamification state
  gamify: {
    streak: 0,               // Current consecutive-day streak
    bestStreak: 0,           // All-time best streak
    lastActiveDate: null,    // ISO date string "YYYY-MM-DD" of last logged activity
    badges: [],              // Array of { id, unlockedAt } for earned badges
    totalHarvests: 0,        // Lifetime harvest count
    totalPlants: 0,          // Lifetime plant count
    totalLogEntries: 0,      // Lifetime activity log entries
  },
};

/* ═══════════════════════════════════════════
   DATA REDUCER — replaces spread-based state updates
   Pure function: (state, action) → newState. Used with useReducer
   in AppInner.
   ═══════════════════════════════════════════ */

export function dataReducer(state, action) {
  if (action.type === 'SET_ALL') return action.data;
  if (action.type === 'TOGGLE_STEP') {
    const plots = state.garden.plots.map(p => {
      if (p.id === action.plotId) {
        const st = [...p.steps];
        st[action.stepIdx] = {...st[action.stepIdx], done: !st[action.stepIdx].done};
        return {...p, steps: st};
      }
      return p;
    });
    return {...state, garden: {plots}};
  }
  // Fallback: merge like the old setData({...data, ...changes})
  return {...state, ...action};
}
