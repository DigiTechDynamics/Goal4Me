-- =============================================================================
-- Running: "become a runner" plans and run logs.
--   * running_plans  – the user's chosen settings. Weeks and sessions are
--                      generated from these by @goal4me/core (generateRunPlan),
--                      so only the settings are stored.
--   * run_logs       – one row per completed session of a plan
--   * start_running_plan – atomically retires the active plan and starts a new one
-- Limits must match RUN_PLAN_LIMITS in @goal4me/core.
-- =============================================================================

create type public.runner_level as enum ('novice', 'beginner', 'intermediate', 'advanced', 'pro');
create type public.run_goal as enum ('5k', '10k', 'half', 'marathon');

create table public.running_plans (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  level public.runner_level not null,
  goal public.run_goal not null,
  days_per_week smallint not null check (days_per_week between 2 and 6),
  weeks smallint not null check (weeks between 4 and 24),
  started_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

-- At most one active plan per user.
create unique index running_plans_one_active on public.running_plans (user_id) where is_active;

create table public.run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null,
  week smallint not null check (week between 1 and 24),
  session_index smallint not null check (session_index between 0 and 5),
  completed_on date not null,
  minutes smallint check (minutes between 1 and 600),
  distance_m integer check (distance_m between 1 and 200000),
  rating public.workout_rating not null,
  created_at timestamptz not null default now(),
  unique (plan_id, week, session_index),
  -- Composite key: a log can only point at its owner's plan.
  foreign key (plan_id, user_id) references public.running_plans (id, user_id) on delete cascade
);

create index run_logs_user on public.run_logs (user_id, created_at desc);

alter table public.running_plans enable row level security;
alter table public.run_logs enable row level security;
create policy "own rows" on public.running_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.run_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.start_running_plan(
  p_id uuid,
  p_level public.runner_level,
  p_goal public.run_goal,
  p_days_per_week smallint,
  p_weeks smallint,
  p_started_on date
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- Retrying the same request is a no-op.
  if exists (select 1 from public.running_plans where id = p_id) then
    return;
  end if;
  -- Old plans and their logs stay as history.
  update public.running_plans set is_active = false where user_id = uid and is_active;
  insert into public.running_plans (id, user_id, level, goal, days_per_week, weeks, started_on)
  values (p_id, uid, p_level, p_goal, p_days_per_week, p_weeks, p_started_on);
end;
$$;

revoke execute on function public.start_running_plan from public, anon;
grant execute on function public.start_running_plan to authenticated;

-- -----------------------------------------------------------------------------
-- export_my_data: now includes running plans and logs.
-- -----------------------------------------------------------------------------
create or replace function public.export_my_data() returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result jsonb := jsonb_build_object('format', 'goal4me-export-v1', 'exported_at', now(), 'user_id', uid);
  t text;
  rows jsonb;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  foreach t in array array['profiles', 'goals', 'body_metrics', 'progress_photos', 'user_programs',
                           'workout_sessions', 'daily_logs', 'streaks', 'achievements', 'budgets',
                           'budget_categories', 'transactions', 'savings_goals',
                           'savings_contributions', 'lesson_progress', 'entitlements',
                           'paynow_payments', 'running_plans', 'run_logs']
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(r) - ''user_id''), ''[]''::jsonb) from public.%I r where r.user_id = $1', t)
      into rows using uid;
    result := result || jsonb_build_object(t, rows);
  end loop;
  return result;
end;
$$;
