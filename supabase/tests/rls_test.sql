-- Behavioural tests for RLS, triggers and constraints. Run after the
-- migrations against a throwaway database (see .github/workflows/ci.yml).
-- Any failed assertion raises an exception and stops psql (ON_ERROR_STOP).
\set QUIET on
begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

do $$ begin
  assert (select count(*) from public.profiles) = 2, 'signup trigger should create profiles';
  assert (select count(*) from public.streaks) = 2, 'signup trigger should create streaks';
end $$;

-- Content created by the service role: one published and one draft exercise.
insert into public.exercises (slug, name, difficulty, met, is_published) values
  ('test-published', 'Test move', 2, 8.0, true),
  ('draft-move', 'Draft move', 1, 3.0, false);

-- ---- Act as Alice -----------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true) as _ \gset
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true) as _ \gset

insert into public.body_metrics (id, user_id, measured_on, weight_kg)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-10-01', 80);

insert into public.budget_categories (id, user_id, name, bucket)
values ('aaaaaaaa-0000-0000-0000-0000000000c1', '11111111-1111-1111-1111-111111111111', 'Food', 'needs');

-- Streak: Mon, Tue, (skip Wed: freeze), Thu, then a 3-day gap resets it.
insert into public.workout_sessions (id, user_id, started_at, duration_s) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2026-10-05 08:00Z', 900),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2026-10-06 08:00Z', 900),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2026-10-06 18:00Z', 600),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2026-10-08 08:00Z', 900);

do $$ declare s record; begin
  select * into s from public.streaks;  -- RLS: only Alice's row is visible
  assert s.current_days = 3, format('streak should be 3 with a freeze, got %s', s.current_days);
  assert s.freezes_left = 0, 'freeze should be used';
  assert (select count(*) from public.streaks) = 1, 'Alice sees only her streak';
  assert exists (select 1 from public.achievements where badge = 'first_workout'), 'badge awarded';
  assert (select count(*) from public.exercises where slug in ('test-published', 'draft-move')) = 1,
    'users only see published content';
end $$;

insert into public.workout_sessions (id, user_id, started_at, duration_s)
values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2026-10-12 08:00Z', 900);
do $$ begin
  assert (select current_days from public.streaks) = 1, 'a long gap resets the streak';
  assert (select best_days from public.streaks) = 3, 'best streak is kept';
end $$;

-- Alice cannot write as Bob, grant herself premium, edit content, or check others' premium.
do $$ begin
  begin
    insert into public.body_metrics (id, user_id, measured_on, weight_kg)
    values (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '2026-10-01', 70);
    raise exception 'FAIL: wrote a row for another user';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.entitlements (user_id, product_id, store, is_active)
    values ('11111111-1111-1111-1111-111111111111', 'premium_yearly', 'promotional', true);
    raise exception 'FAIL: user granted themselves premium';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.exercises (slug, name, difficulty, met) values ('hack', 'Hack', 1, 1);
    raise exception 'FAIL: non-admin edited content';
  exception when insufficient_privilege then null; end;

  begin
    perform public.has_premium('22222222-2222-2222-2222-222222222222');
    raise exception 'FAIL: user probed premium status';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.workout_sessions (id, user_id, started_at, duration_s)
    values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', now(), 99999);
    raise exception 'FAIL: impossible duration accepted';
  exception when check_violation then null; end;
end $$;

-- complete_onboarding saves everything at once and can be re-run safely.
select public.complete_onboarding('female', '1996-05-01', 165, 78, 'metric', 'ZW', 'USD',
  'Africa/Harare', 'lose_weight', 68, 'light', 'beginner', '{belly}', '{}', 4::smallint,
  15::smallint, null, 'fat-burn-home', false);
select public.complete_onboarding('female', '1996-05-01', 165, 77.5, 'metric', 'ZW', 'USD',
  'Africa/Harare', 'tone_up', 68, 'light', 'beginner', '{belly}', '{}', 4::smallint,
  15::smallint, null, 'fat-burn-home', false);
do $$ begin
  assert (select count(*) from public.goals where is_current) = 1, 'exactly one current goal';
  assert (select goal from public.goals where is_current) = 'tone_up', 'latest goal is current';
  assert (select country from public.profiles) = 'ZW', 'profile updated';
  begin
    perform public.complete_onboarding('female', '1996-05-01', 500, 78, 'metric', 'ZW', 'USD',
      'Africa/Harare', 'lose_weight', 68, 'light', 'beginner', '{}', '{}', 4::smallint,
      15::smallint, null, 'fat-burn-home', false);
    raise exception 'FAIL: impossible height accepted';
  exception when check_violation then null; end;
end $$;

-- Seeded content: 4 programmes x 28 days, onboarding starts the programme.
do $$ begin
  assert (select count(*) from public.programs where is_published) = 4, 'four programmes seeded';
  assert (select count(*) from public.program_days) = 112, '28 days each';
  assert (select count(*) from public.user_programs where is_active) = 1, 'onboarding started a programme';
end $$;

-- log_workout is idempotent and advances the programme.
select public.log_workout('bbbbbbbb-0000-0000-0000-000000000001',
  (select d.id from public.program_days d join public.programs p on p.id = d.program_id
    where p.slug = 'fat-burn-home' and d.day_number = 1),
  now() - interval '20 minutes', 900, 120, 'too_easy', 1.0) as first_log \gset
select public.log_workout('bbbbbbbb-0000-0000-0000-000000000001',
  (select d.id from public.program_days d join public.programs p on p.id = d.program_id
    where p.slug = 'fat-burn-home' and d.day_number = 1),
  now() - interval '20 minutes', 900, 120, 'too_easy', 1.0) as second_log \gset
-- psql variables don't expand inside $$ bodies, so check them in plain SQL.
select case when :'first_log'::boolean and not :'second_log'::boolean then 'ok'
            else (1 / 0)::text end as idempotent_log \gset
do $$ begin
  assert (select current_day from public.user_programs where is_active) = 2, 'programme advanced to day 2';
end $$;

-- ---- Act as Bob -------------------------------------------------------------
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true) as _ \gset
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true) as _ \gset

do $$ begin
  assert (select count(*) from public.body_metrics) = 0, 'Bob must not see Alice''s metrics';
  assert (select count(*) from public.workout_sessions) = 0, 'Bob must not see Alice''s workouts';
  assert (select count(*) from public.profiles) = 1, 'Bob sees only his own profile';

  -- Bob cannot attach a transaction to Alice's category (composite FK + RLS).
  begin
    insert into public.transactions (id, user_id, occurred_on, amount_minor, currency, category_id)
    values (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '2026-10-01', 500, 'USD',
            'aaaaaaaa-0000-0000-0000-0000000000c1');
    raise exception 'FAIL: used another user''s category';
  exception when foreign_key_violation then null; end;

  update public.profiles set display_name = 'hijacked'
   where user_id = '11111111-1111-1111-1111-111111111111';
end $$;

-- ---- Back to the service role: account deletion cascades -------------------
reset role;
do $$ begin
  assert (select display_name from public.profiles
           where user_id = '11111111-1111-1111-1111-111111111111') is null,
         'Bob''s update must not touch Alice''s profile';
end $$;

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  assert (select count(*) from public.body_metrics) = 0, 'metrics deleted with the account';
  assert (select count(*) from public.workout_sessions) = 0, 'workouts deleted with the account';
  assert (select count(*) from public.content_audit_log
           where new_row ->> 'slug' in ('test-published', 'draft-move')) = 2, 'content inserts were audited';
end $$;

rollback;
\echo 'All database tests passed'
