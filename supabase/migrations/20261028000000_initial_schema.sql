-- =============================================================================
-- Goal4Me: initial schema
--
-- Conventions
--   * Every table holding user data has user_id -> auth.users ON DELETE CASCADE,
--     so deleting an account removes all of that user's rows.
--   * Row-level security (RLS) is enabled on EVERY table. Users only ever see
--     their own rows; content is read-only except for admins.
--   * Policies use `(select auth.uid())` rather than `auth.uid()` so Postgres
--     evaluates it once per query instead of once per row (big win at scale).
--   * Money is stored as bigint minor units (cents); weights/lengths as numeric.
--   * Ids for rows created offline (sessions, metrics, transactions) are
--     generated on the device, which makes retried syncs idempotent.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums (mirror the string unions in packages/core/src/types.ts)
-- -----------------------------------------------------------------------------
create type public.sex as enum ('female', 'male');
create type public.goal_type as enum ('lose_weight', 'tone_up', 'build_strength', 'get_flexible');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
create type public.fitness_level as enum ('none', 'beginner', 'intermediate', 'advanced');
create type public.workout_rating as enum ('too_easy', 'just_right', 'too_hard');
create type public.budget_bucket as enum ('needs', 'wants', 'savings');
create type public.entitlement_store as enum ('app_store', 'play_store', 'paynow', 'promotional');
create type public.workout_phase as enum ('warmup', 'main', 'cooldown');

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Admins are marked with app_metadata.role = 'admin' (set via the service role,
-- never editable by the user themselves).
create function public.is_admin() returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles & goals
-- -----------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  sex public.sex,
  birth_date date check (birth_date > '1900-01-01'),
  height_cm numeric(4, 1) check (height_cm between 120 and 230),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  country char(2) check (country in ('ZW', 'ZA', 'BW', 'ZM', 'MW', 'US', 'GB', 'IN')),
  currency char(3) check (currency in ('USD', 'ZAR', 'BWP', 'ZMW', 'MWK', 'GBP', 'INR')),
  timezone text not null default 'UTC',
  -- Consent records (spec: Compliance). Null = not given.
  health_consent_at timestamptz,
  disclaimer_accepted_at timestamptz,
  guardian_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create an empty profile (and streak row) whenever someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  insert into public.streaks (user_id) values (new.id);
  return new;
end;
$$;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal public.goal_type not null,
  target_weight_kg numeric(4, 1) not null check (target_weight_kg between 30 and 300),
  activity public.activity_level not null,
  fitness_level public.fitness_level not null,
  problem_areas text[] not null default '{}',
  limitations text[] not null default '{}',
  days_per_week smallint not null check (days_per_week between 2 and 6),
  minutes_per_session smallint not null check (minutes_per_session in (10, 15, 20, 30)),
  money_goal text,
  -- Old goals are kept as history; exactly one is current.
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index goals_one_current_per_user on public.goals (user_id) where is_current;

-- -----------------------------------------------------------------------------
-- Body tracking
-- -----------------------------------------------------------------------------
create table public.body_metrics (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(4, 1) not null check (weight_kg between 30 and 300),
  waist_cm numeric(4, 1) check (waist_cm between 20 and 250),
  hips_cm numeric(4, 1) check (hips_cm between 20 and 250),
  chest_cm numeric(4, 1) check (chest_cm between 20 and 250),
  arm_cm numeric(4, 1) check (arm_cm between 20 and 250),
  created_at timestamptz not null default now(),
  -- One entry per day keeps charts clean; the app upserts on this key.
  unique (user_id, measured_on)
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  taken_on date not null,
  pose text not null check (pose in ('front', 'side', 'back')),
  -- Path inside the private "progress-photos" bucket: <user_id>/<uuid>.jpg
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
create index progress_photos_user_taken on public.progress_photos (user_id, taken_on desc);

-- -----------------------------------------------------------------------------
-- Fitness content (editable by admins, readable by everyone)
-- -----------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null default '',
  form_tips text[] not null default '{}',
  muscles text[] not null default '{}',
  difficulty smallint not null check (difficulty between 1 and 5),
  -- Metabolic equivalent, used for calorie estimates (kcal = MET x kg x hours).
  met numeric(3, 1) not null check (met > 0 and met < 20),
  video_path text,
  cue_audio_path text,
  -- Limitations (knees, back, wrists) this exercise must be hidden for.
  contraindications text[] not null default '{}',
  easier_id uuid references public.exercises (id) on delete set null,
  harder_id uuid references public.exercises (id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null default '',
  goal public.goal_type not null,
  level public.fitness_level not null,
  duration_days smallint not null default 28 check (duration_days between 1 and 365),
  is_premium boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  day_number smallint not null check (day_number >= 1),
  title text not null,
  is_rest_day boolean not null default false,
  unique (program_id, day_number)
);

create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days (id) on delete cascade,
  position smallint not null check (position >= 1),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  phase public.workout_phase not null default 'main',
  rounds smallint not null default 1 check (rounds between 1 and 10),
  target_reps smallint check (target_reps between 1 and 200),
  target_seconds smallint check (target_seconds between 5 and 600),
  rest_seconds smallint not null default 30 check (rest_seconds between 0 and 300),
  -- Each item is either rep-based or timed, never both.
  check (num_nonnulls(target_reps, target_seconds) = 1),
  unique (program_day_id, position)
);
create index program_items_exercise on public.program_items (exercise_id);

-- -----------------------------------------------------------------------------
-- Workouts & habits
-- -----------------------------------------------------------------------------
create table public.user_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete restrict,
  started_on date not null default current_date,
  current_day smallint not null default 1 check (current_day >= 1),
  -- Auto-progression multiplier (see nextIntensityFactor in @goal4me/core).
  intensity_factor numeric(3, 2) not null default 1 check (intensity_factor between 0.5 and 2),
  is_active boolean not null default true,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index user_programs_one_active on public.user_programs (user_id) where is_active;

create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  program_day_id uuid references public.program_days (id) on delete set null,
  started_at timestamptz not null,
  duration_s integer not null check (duration_s between 1 and 10800),
  kcal_est integer check (kcal_est between 0 and 5000),
  rating public.workout_rating,
  created_at timestamptz not null default now()
);
create index workout_sessions_user_started on public.workout_sessions (user_id, started_at desc);

create table public.daily_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  water_ml integer check (water_ml between 0 and 10000),
  steps integer check (steps between 0 and 150000),
  primary key (user_id, log_date)
);

create table public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_days integer not null default 0 check (current_days >= 0),
  best_days integer not null default 0 check (best_days >= 0),
  last_active_on date,
  -- One free "streak freeze" per ISO week (spec: Progress tracking).
  freezes_left smallint not null default 1 check (freezes_left between 0 and 1),
  freeze_week date
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  badge text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge)
);

-- Updates the streak and awards badges whenever a workout is logged.
-- Runs as definer because users may not write streaks/achievements directly.
create function public.on_workout_logged() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text;
  day date;
  week date;
  s public.streaks%rowtype;
begin
  select coalesce(p.timezone, 'UTC') into tz from public.profiles p where p.user_id = new.user_id;
  -- The workout counts for the day it happened in the user's own time zone.
  day := (new.started_at at time zone coalesce(tz, 'UTC'))::date;
  week := date_trunc('week', day)::date;

  insert into public.streaks (user_id) values (new.user_id) on conflict (user_id) do nothing;
  select * into s from public.streaks where user_id = new.user_id for update;

  -- A new week refills the freeze.
  if s.freeze_week is null or s.freeze_week < week then
    s.freezes_left := 1;
    s.freeze_week := week;
  end if;

  if s.last_active_on is null then
    s.current_days := 1;
  elsif day <= s.last_active_on then
    -- Same day, or an older workout synced late: streak unchanged.
    return new;
  elsif day = s.last_active_on + 1 then
    s.current_days := s.current_days + 1;
  elsif day = s.last_active_on + 2 and s.freezes_left > 0 then
    -- Exactly one missed day is covered by the weekly freeze.
    s.current_days := s.current_days + 1;
    s.freezes_left := s.freezes_left - 1;
  else
    s.current_days := 1;
  end if;

  s.best_days := greatest(s.best_days, s.current_days);
  s.last_active_on := day;

  update public.streaks
     set current_days = s.current_days,
         best_days = s.best_days,
         last_active_on = s.last_active_on,
         freezes_left = s.freezes_left,
         freeze_week = s.freeze_week
   where user_id = new.user_id;

  insert into public.achievements (user_id, badge) values (new.user_id, 'first_workout')
    on conflict do nothing;
  if s.current_days >= 7 then
    insert into public.achievements (user_id, badge) values (new.user_id, 'streak_7')
      on conflict do nothing;
  end if;
  if s.current_days >= 30 then
    insert into public.achievements (user_id, badge) values (new.user_id, 'streak_30')
      on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger workout_sessions_after_insert after insert on public.workout_sessions
  for each row execute function public.on_workout_logged();

-- -----------------------------------------------------------------------------
-- Money
-- -----------------------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  income_minor bigint not null check (income_minor >= 0),
  currency char(3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  bucket public.budget_bucket not null,
  monthly_limit_minor bigint check (monthly_limit_minor >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name),
  -- Target for the composite foreign keys below.
  unique (id, user_id)
);

create table public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  category_id uuid not null,
  note varchar(140),
  created_at timestamptz not null default now(),
  -- Composite FK: a transaction can only use a category owned by the same user.
  foreign key (category_id, user_id) references public.budget_categories (id, user_id)
    on delete restrict
);
create index transactions_user_date on public.transactions (user_id, occurred_on desc);
create index transactions_category on public.transactions (category_id, user_id);

create table public.savings_goals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  target_minor bigint not null check (target_minor > 0),
  currency char(3) not null,
  due_on date,
  is_emergency_fund boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.savings_contributions (
  id uuid primary key,
  goal_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Negative = withdrawal.
  amount_minor bigint not null check (amount_minor <> 0),
  made_on date not null,
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.savings_goals (id, user_id) on delete cascade
);
create index savings_contributions_goal on public.savings_contributions (goal_id, user_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  track text not null check (track in ('budgeting', 'debt', 'saving', 'investing', 'side_income')),
  position smallint not null check (position >= 1),
  title text not null,
  body_md text not null,
  -- [{ "question": "...", "options": ["..."], "answer": 0 }, ...]
  quiz jsonb not null default '[]'::jsonb check (jsonb_typeof(quiz) = 'array'),
  action text,
  is_premium boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track, position)
);

create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  quiz_score smallint check (quiz_score between 0 and 3),
  primary key (user_id, lesson_id)
);

-- -----------------------------------------------------------------------------
-- Billing (written ONLY by the service role from webhooks; users read their own)
-- -----------------------------------------------------------------------------
create table public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement text not null default 'premium',
  product_id text not null,
  store public.entitlement_store not null,
  is_active boolean not null,
  expires_at timestamptz,
  original_transaction_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement)
);

create table public.paynow_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null check (plan_id in ('premium_weekly', 'premium_quarterly', 'premium_yearly')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'USD',
  -- Our merchant reference sent to PayNow; also the idempotency key.
  reference text not null unique,
  poll_url text,
  status text not null default 'created'
    check (status in ('created', 'sent', 'paid', 'awaiting_delivery', 'delivered', 'cancelled', 'failed', 'disputed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index paynow_payments_user on public.paynow_payments (user_id, created_at desc);

-- Server-side premium check used by Edge Functions and future RLS rules.
create function public.has_premium(uid uuid) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements e
     where e.user_id = uid
       and e.entitlement = 'premium'
       and e.is_active
       and (e.expires_at is null or e.expires_at > now())
  )
$$;

-- -----------------------------------------------------------------------------
-- Content audit log (spec: every admin change to content is recorded)
-- -----------------------------------------------------------------------------
create table public.content_audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now(),
  old_row jsonb,
  new_row jsonb
);

create function public.audit_content_change() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.content_audit_log (table_name, row_id, action, old_row, new_row)
  values (
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
    tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- Triggers wired up in bulk
-- -----------------------------------------------------------------------------
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
declare t text;
begin
  foreach t in array array['exercises', 'programs', 'lessons', 'budgets', 'budget_categories',
                           'savings_goals', 'entitlements']
  loop
    execute format('create trigger %I before update on public.%I
                    for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;

  foreach t in array array['exercises', 'programs', 'program_days', 'program_items', 'lessons']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.audit_content_change()', t || '_audit', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  -- Tables the user fully owns: read and write only their own rows.
  foreach t in array array['profiles', 'goals', 'body_metrics', 'progress_photos', 'user_programs',
                           'workout_sessions', 'daily_logs', 'budgets', 'budget_categories',
                           'transactions', 'savings_goals', 'savings_contributions', 'lesson_progress']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;

  -- Tables only the server writes (triggers, webhooks): users can read their own.
  foreach t in array array['streaks', 'achievements', 'entitlements', 'paynow_payments']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format(
      'create policy "read own rows" on public.%I for select to authenticated
         using (user_id = (select auth.uid()))', t);
  end loop;

  -- Content: everyone reads published rows; admins read and write everything.
  -- Premium gating of workouts and lessons is enforced when content is served
  -- (Edge Functions + signed video URLs), not by hiding catalogue metadata.
  foreach t in array array['exercises', 'programs', 'lessons']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "read published" on public.%I for select to anon, authenticated
         using (is_published or (select public.is_admin()))', t);
    execute format(
      'create policy "admins write" on public.%I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- Program days/items inherit visibility from their programme.
alter table public.program_days enable row level security;
alter table public.program_items enable row level security;
grant select on public.program_days, public.program_items to anon, authenticated;
grant insert, update, delete on public.program_days, public.program_items to authenticated;

create policy "read with program" on public.program_days for select to anon, authenticated
  using (exists (select 1 from public.programs p where p.id = program_id));
create policy "admins write" on public.program_days for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "read with program" on public.program_items for select to anon, authenticated
  using (exists (select 1 from public.program_days d where d.id = program_day_id));
create policy "admins write" on public.program_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.content_audit_log enable row level security;
revoke all on public.content_audit_log from anon, authenticated;
grant select on public.content_audit_log to authenticated;
create policy "admins read" on public.content_audit_log for select to authenticated
  using ((select public.is_admin()));

-- Only the server (service role) may check premium status, so users cannot
-- probe whether other accounts are subscribed.
revoke execute on function public.has_premium(uuid) from public, anon;
revoke execute on function public.has_premium(uuid) from authenticated;
grant execute on function public.has_premium(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Storage: private bucket for progress photos, one folder per user
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "progress photos: own folder" on storage.objects for all to authenticated
  using (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
