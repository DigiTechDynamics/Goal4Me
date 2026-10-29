# Goal4Me

Personalised home calisthenics, health tracking and money coaching for iOS,
Android and web. Users take a short quiz (age, sex, height, weight, goals),
get their BMI, calorie and protein targets and a 28-day bodyweight programme,
then track workouts, body progress, budgets and savings in one app.

> Product spec and architecture live in the project documents
> ("Goal4Me: Product Spec" and "Goal4Me: Architecture & Design").

## Status

| Stage | Scope                                                                                    | State |
| ----- | ---------------------------------------------------------------------------------------- | ----- |
| 1     | Monorepo, CI, core formulas, shared schemas, database schema with RLS                    | Done  |
| 2     | Expo app shell, sign-in, onboarding quiz, result screen                                  | Done  |
| 3     | Exercise library, programmes, workout player, offline sync                               | Done  |
| 4     | Weigh-ins + chart, measurements, private photos, streaks/badges, water, export, deletion | Done  |
| 5     | Finance module and lessons                                                               | Done  |
| 6a    | Premium: PayNow (web) + RevenueCat (stores), paywall, free-tier locks                    | Done  |
| 6b    | Analytics, crash reporting, store builds, Apple Health / Health Connect sync             | Done  |
| 7     | Running: novice-to-pro ladder, guides, customisable plans, guided run player             | Done  |

Apple Health, Health Connect and store purchases use native modules, so test
them in an EAS development build (not Expo Go). Everything else also runs on
the web.

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
│   ├── functions/          # Edge Functions (Deno): PayNow checkout/result/status,
│   │                       # RevenueCat webhook; _shared/ holds tested helpers
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

### Sign-up email and Google sign-in (local)

Without these, sign-up emails only land in Mailpit (http://localhost:54324)
and "Continue with Google" fails with "provider is not enabled".

Both are off by default, so a fresh setup keeps working with Mailpit. To
turn them on, fill in the values below, set `enabled = true` under
`[auth.email.smtp]` and/or `[auth.external.google]` in
`supabase/config.toml`, then restart:

```bash
cp supabase/.env.example supabase/.env   # fill in the values below
supabase stop && supabase start          # config is read at start
```

1. **Email from Gmail**: turn on 2-Step Verification for
   digitaltechdynamics@gmail.com, create an App Password (Google Account →
   Security → App passwords) and set it as `SMTP_PASS`. Gmail caps sending at
   about 500 emails a day, so move to a domain sender (Resend, Brevo, Amazon
   SES) before launch.
2. **Google sign-in**: in Google Cloud Console create an OAuth consent screen
   (External, add your test users), then an OAuth client ID of type _Web
   application_ with the authorised redirect URI
   `http://127.0.0.1:54321/auth/v1/callback`. Put its ID and secret in
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

For the hosted project, set the same values in the Supabase dashboard
(Authentication → Emails → SMTP Settings, and Authentication → Sign In /
Providers → Google), with the redirect URI
`https://<project-ref>.supabase.co/auth/v1/callback` added to the Google
client, and the app's URLs under Authentication → URL Configuration. The
native apps also need iOS and Android OAuth clients in the same Google
Cloud project.

### Run the SQL tests without Supabase

CI applies the migrations to a plain Postgres 17 using a small stub of the
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

CI fails if the committed seed is out of date.

### Exercise demonstrations

Every exercise has an original animated figure (vector shapes, no third-party
footage) in `apps/mobile/src/features/workouts/motion/`, keyed by slug. Each
motion is a few keyframes of limb angles; `skeleton.ts` explains the angle
convention, keeps the figure on the floor and frames it. A test fails if a
library exercise has no motion or a figure leaves the frame, so add a motion
to `motions.ts` whenever you add an exercise. The animation pauses with the
workout and holds a still pose when the device's "reduce motion" is on.

Licensed video replaces the animation per exercise, with no code change: set
`EXPO_PUBLIC_VIDEO_CDN_URL` and fill `exercises.video_path` for the clips you
have. Exercises without a clip keep their animation.

## Progress and privacy

- **Weigh-ins** are one per day (`log_body_metric` upserts). The chart shows
  a 7-entry moving average, because daily weight swings 1–2 kg with water.
- **Streaks** are updated by a database trigger when a workout is logged;
  the app recomputes the _live_ streak (`liveStreak` in `packages/core`) so a
  stale "12 days" is never shown after the user stops training.
- **Progress photos** sit in a private bucket under `<user_id>/…`, enforced
  by a Storage policy and a CHECK constraint, and are only shown through
  signed URLs that expire after an hour (never persisted to the device).
- **Export and deletion** (`export_my_data`, `delete_my_account`) live under
  Profile → Your data. Deletion removes photos first, then the auth user;
  every table cascades except PayNow payments, which are kept anonymised
  for tax records. Sign-out also wipes the cached data on the device.

## Money module

- **Budgets**: `setup_budget` stores a month's take-home income; the first
  budget also creates 8 starter categories whose limits follow 50/30/20.
  Categories are archived rather than deleted so history stays intact.
- **Expenses, goals and contributions** are written directly under RLS, with
  device-generated ids so a retried save never duplicates. Withdrawals are
  negative contributions.
- **Money score** (0–100) = saving rate (35) + emergency fund months (30) +
  lessons done (20) + days in a row with money activity (15).
- **Lessons** live in `packages/content/src/lessons.ts` (5 tracks × 6) and are
  generated into `supabase/migrations/20261028050000_seed_lessons.sql`. The
  first lessons of Budgeting, Saving and Debt are free; the other 27 are premium.

## Running

Workouts → Running takes people from their first run to a marathon.

- **Level quiz**: two questions (`assessRunnerLevel`) place the runner on the
  Starter → Builder → Racer → Pro ladder (`RUN_LEVEL_INFO`) and recommend a
  programme. The level is saved on `profiles.runner_level`.
- **Programmes** (`packages/core/src/running.ts`): Couch to 5K, 5K to 10K,
  Faster 5K, 10K to half marathon, Half to marathon. Everything is
  time-based, so it works without GPS and in km or miles.
- **Plans are generated, not stored.** `run_plans.settings` keeps the runner's
  choices (days per week, which days, long-run day, start, optional race date
  and goal time); `buildRunPlan` turns them into dated sessions on the device.
  Couch to 5K never schedules more than 3 runs a week (extra days become
  recovery walks); other plans keep one quality session and one long run a
  week and drop easy runs first. A race date shifts the plan so the race is
  the last run, adds up to 6 base weeks or trims up to a third of the early
  weeks. Editing settings keeps the runner in the same week (`rebaseProgress`).
- **Pace zones** come from the goal time via Riegel's formula (`pace.ts`).
- **Run player**: wall-clock state machine (`features/running/player`), so a
  phone in a pocket shows the right segment when unlocked; voice cues,
  haptics and keep-awake. Runs are queued offline and sent with the
  idempotent `log_run`, then feed streaks, badges and the health app.
  Effort ("easy / just right / hard") nudges run time by 5% (0.85×–1.15×).
- **Guides**: 24 two-minute reads (`packages/content/src/runGuides.ts`),
  generated into `20261029010000_seed_run_guides.sql`.
- **Free tier**: the first 3 runs of every plan and the Starter guides,
  enforced by RLS on `run_sessions` and `run_guides`.
- **Not yet**: live GPS distance tracking and voice cues while the screen is
  locked need background location/audio permissions and on-device testing;
  they're the next running phase.

## Premium and payments

The free tier is the quiz and results, the first 3 workouts of each programme,
weight logging and 3 money lessons. **The database enforces this**
(`20261028070000_premium_gating.sql`): free users can't read the exercises of
locked days or the content of premium lessons, whatever the app does. The app
shows locks and a paywall instead of empty screens.

| Where         | How people pay                         | Renews | Grants premium via                                                  |
| ------------- | -------------------------------------- | ------ | ------------------------------------------------------------------- |
| iOS / Android | App Store / Google Play via RevenueCat | Yes    | `revenuecat-webhook` Edge Function                                  |
| Web           | PayNow: card, EcoCash, OneMoney        | No     | `paynow-result` (PayNow callback) and `paynow-status` (app polling) |

- Store rules forbid outside payment links in the native apps, so PayNow is
  only offered on the web.
- PayNow results are never trusted from the browser: each one is confirmed by
  polling PayNow and checking its SHA-512 hash before premium is granted, and
  a payment can only be applied once.
- Prices: weekly $6.99, quarterly $29.99, yearly $59.99 (7-day free trial in
  the stores). `PLAN_PRICES_USD` in `packages/schemas` and
  `supabase/functions/_shared/plans.ts` are kept identical by a unit test.

### Setting up payments

1. **PayNow**: create an integration in the PayNow merchant dashboard, then
   `supabase secrets set PAYNOW_INTEGRATION_ID=… PAYNOW_INTEGRATION_KEY=…`
   plus `PAYNOW_RESULT_URL` (the deployed `paynow-result` function URL),
   `PAYNOW_RETURN_URL` (`https://<your web app>/paynow/return`) and `APP_ORIGIN`.
2. **RevenueCat**: create products `premium_weekly`, `premium_quarterly` and
   `premium_yearly` in App Store Connect and Play Console, attach them to an
   entitlement named `premium` and a "default" offering (Weekly, 3 Month,
   Annual packages). Put the public SDK keys in `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, add a webhook to the deployed
   `revenuecat-webhook` function with the Authorization header `Bearer <secret>`, and set that secret with
   `supabase secrets set REVENUECAT_WEBHOOK_SECRET=…`.
3. Deploy: `supabase functions deploy` (the two webhooks have JWT checks off in
   `config.toml` because PayNow and RevenueCat can't send a Supabase token;
   they verify their own signatures instead).

### Test the Edge Functions

```bash
cd supabase/functions
deno fmt --check && deno lint && deno check */*.ts && deno test -A
```

## Monitoring, health sync and privacy

- **Crash reporting**: Sentry (`lib/monitoring.ts`), on only when
  `EXPO_PUBLIC_SENTRY_DSN` is set. No IP or request bodies are sent, URLs lose
  their query strings, and every `logger.error` is reported with the same
  redaction the logger applies.
- **Analytics**: PostHog EU cloud (`lib/analytics.ts`), on only when
  `EXPO_PUBLIC_POSTHOG_KEY` is set. Events are a fixed, typed list (onboarding,
  workouts, lessons, paywall, checkout) with no health or money values, IP
  geolocation is off, and users can switch it off in Profile.
- **Apple Health / Health Connect** (`features/health`): opt-in from Profile.
  Goal4Me only _writes_ weigh-ins and workouts, never reads. Each record
  carries a stable id so re-saving a day updates it instead of duplicating.
  The setting is per device and is switched off on sign-out.

## Store builds (EAS)

```bash
npm i -g eas-cli && eas login
cd apps/mobile
eas init                                  # links the project, writes the project id
eas env:create --name SENTRY_AUTH_TOKEN --visibility secret   # plus every EXPO_PUBLIC_* value
eas build --profile development --platform ios     # dev client for testing native modules
eas build --profile production --platform all
eas submit --profile production --platform all
```

Profiles live in `apps/mobile/eas.json`: `development` (dev client),
`preview` (internal testers, Android APK) and `production` (store builds with
auto-incremented build numbers). Before the first production build, enable
HealthKit for the `com.goal4me.app` identifier in the Apple Developer portal
and complete the Health Connect declaration in Play Console.

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
| Race prediction     | Riegel: t₂ = t₁ × (d₂ ÷ d₁)^1.06; easy pace 1.25–1.4× and tempo 1.06–1.12× the 5K-equivalent pace                  |
| Money score         | savings rate 35, emergency fund 30, lessons 20, budgeting streak 15                                                |

## Environment variables

See [`.env.example`](.env.example). Variables prefixed `EXPO_PUBLIC_` are
bundled into the app; everything else is a server secret set with
`supabase secrets set` and must never be given that prefix.

## Disclaimer

Goal4Me provides general fitness and financial education. It is not medical or
financial advice.
