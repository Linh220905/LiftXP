# Train XP

Train XP turns real gym workouts into a progression game with fast set logging, XP, lift ranks, streaks, and social motivation.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/train-xp` — Expo mobile app and local AsyncStorage state.
- `artifacts/train-xp/context/AppState.tsx` — persisted onboarding, player stats, and workout completion state.
- `artifacts/train-xp/app` — onboarding, tab navigation, home, workout logger, rank, social, and profile screens.
- `artifacts/train-xp/constants/colors.ts` — shared Train XP palette.

## Architecture decisions

- The first build is frontend-first and uses AsyncStorage so the complete first-session loop works without account setup.
- The core loop is intentionally direct: onboarding sends the user into a templated Push workout, then completion updates XP, level, streak, PRs, and volume.
- Exercise rank copy is framed as game progression, not scientific strength measurement.

## Product

- Dark-first fitness game experience with original comet companion mascot.
- Onboarding personalizes experience and goal, then begins the first workout.
- Home communicates level, XP, streak, daily quest, and lift progression.
- Workout logger supports editable weight/reps, one-tap set completion, add set, rest timer, and completion rewards.
- Rank, social leaderboard/activity, and profile/achievement screens provide the supporting progression loop.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
