# Goal4Me

Personalised home calisthenics, health tracking and money coaching for iOS,
Android and web. Users take a short quiz (age, sex, height, weight, goals),
get their BMI, calorie and protein targets and a 28-day bodyweight programme,
then track workouts, body progress, budgets and savings in one app.

> Product spec and architecture live in the project documents
> ("Goal4Me: Product Spec" and "Goal4Me: Architecture & Design").

## Status

| Stage | Scope                                                                 | State      |
| ----- | --------------------------------------------------------------------- | ---------- |
| 1     | Monorepo, CI, core formulas, shared schemas, database schema with RLS | ✅ This PR |
| 2     | Expo app shell, sign-in, onboarding quiz, result screen               | Next       |
| 3     | Exercise library, programmes, workout player, offline cache           | Planned    |
| 4     | Progress tracking, streaks, Health sync                               | Planned    |
| 5     | Finance module and lessons                                            | Planned    |
| 6     | RevenueCat + PayNow paywall, analytics, store builds                  | Planned    |

## Tech stack

| Layer      | Choice                                                               |
| ---------- | -------------------------------------------------------------------- |
| Language   | TypeScript (strict)                                                  |
| App        | Expo (React Native) with Expo Router: iOS, Android and web           |
| Backend    | Supabase: Postgres, Auth, Storage, Edge Functions                    |
| Payments   | RevenueCat (App Store, Play Store) and PayNow (web, Zimbabwe)        |
| Video      | Licensed stock clips on Cloudflare R2 + CDN                          |
| Monitoring | PostHog (analytics), Sentry (errors)                                 |
| Tooling    | pnpm workspaces, Turborepo, Vitest, ESLint, Prettier, GitHub Actions |

## Repository layout

```
goal4me/
├── apps/
│   └── mobile/             # Expo app (iOS, Android, web)
│       └── src/
│           ├── app/        # Expo Router screens only (no business logic)
│           ├── components/ # Design-system components (ui/) and shared views
│           ├── features/   # auth, onboarding, home: api, hooks, components, tests
│           ├── lib/        # Supabase client, env validation, logger, errors, formatting
│           └── theme/      # Design tokens (colours, spacing, typography)
├── packages/
│   ├── core/               # Pure business logic: BMI, BMR/TDEE, calorie targets,
│   │                       # projections, workout progression, money maths + tests
│   ├── schemas/            # Zod schemas shared by the app and Edge Functions + tests
│   └── content/            # Exercise library + programme templates → generated seed SQL
├── supabase/
│   ├── config.toml         # Local Supabase settings
│   ├── migrations/         # SQL schema, RLS policies, triggers, storage bucket
│   └── tests/              # SQL tests for RLS and triggers (run in CI)
└── .github/workflows/ci.yml
```

Design rules:

- `packages/core` has **no dependencies and no I/O**, so the same formulas run
  on the device and on the server and are fully unit-tested.
- Inputs are validated twice: by `packages/schemas` at the edges, and by range
  guards inside `core` so a bug can never produce a dangerous recommendation.
- **Every table has row-level security.** Users can only read and write their
  own rows; billing tables are written only by server webhooks.

## Getting started

### Prerequisites

- Node.js 22 (`nvm use`)
- pnpm 10 (`corepack enable`)
- For the database: [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker

### Install and check

```bash
corepack enable
pnpm install
pnpm check        # lint + format check + typecheck + tests
```

Individual tasks: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format`.

### Run the app

```bash
cp .env.example apps/mobile/.env   # fill in EXPO_PUBLIC_SUPABASE_URL and _ANON_KEY
pnpm --filter @goal4me/mobile start   # then press i (iOS), a (Android) or w (web)
```

Sign in with Apple and Google need a development build (`npx expo run:ios` or
`eas build --profile development`) and the providers enabled in Supabase Auth.
If the Supabase variables are missing, the app shows a configuration screen
instead of crashing.

### Run the database locally

```bash
cp .env.example .env
supabase start            # starts Postgres, Auth, Storage on Docker
supabase db reset         # applies supabase/migrations
```

Copy the `anon key` printed by `supabase start` into `.env`.

### Run the SQL tests without Supabase

CI applies the migrations to a plain Postgres 16 using a small stub of the
Supabase `auth` and `storage` schemas:

```bash
psql -v ON_ERROR_STOP=1 -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -f "$f"; done
psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
```

## Workout content

Exercises and programmes are written in TypeScript in `packages/content`
(typed and tested: every regression link exists, every programme still gives
a full workout for any combination of knee, back and wrist limitations).
After editing content, regenerate the seed migration:

```bash
pnpm --filter @goal4me/content generate
```

CI fails if the committed seed is out of date. Exercise videos are optional:
set `EXPO_PUBLIC_VIDEO_CDN_URL` and fill `exercises.video_path` once the stock
clips are licensed; until then the player shows illustrated cards.

## Key formulas (`packages/core`)

| Output              | Formula                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| BMI                 | weight (kg) ÷ height (m)², WHO bands 18.5 / 25 / 30                                                                |
| BMR                 | Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age + 5 (men) or − 161 (women)                                                |
| TDEE                | BMR × activity factor (1.2 to 1.9)                                                                                 |
| Calorie target      | TDEE − 20% to lose, + 10% to build strength; never below 1,200 (women) / 1,500 (men); hidden for underweight users |
| Protein / water     | 1.6 g/kg, 33 ml/kg                                                                                                 |
| Goal date           | compounding 0.65 %/week loss or 0.25 %/week gain, capped at 2 years                                                |
| Workout progression | −10 % after "too hard", +10 % after two "too easy", clamped 0.5×–2×                                                |
| Money score         | savings rate 35, emergency fund 30, lessons 20, budgeting streak 15                                                |

## Environment variables

See [`.env.example`](.env.example). Variables prefixed `EXPO_PUBLIC_` are
bundled into the app; everything else is a server secret set with
`supabase secrets set` and must never be given that prefix.

## Disclaimer

Goal4Me provides general fitness and financial education. It is not medical or
financial advice.
