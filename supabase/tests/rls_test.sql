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

-- Stage 4 (onboarding already logged today): weigh-ins replace the same day's entry and keep the original id.
select public.log_body_metric('aaaaaaaa-0000-0000-0000-000000000002', current_date - 3, 79.5, 90);
select public.log_body_metric('aaaaaaaa-0000-0000-0000-000000000003', current_date - 3, 79.1, null, 101);
do $$ declare m record; begin
  select * into m from public.body_metrics where measured_on = current_date - 3;
  assert m.id = 'aaaaaaaa-0000-0000-0000-000000000002', 'same-day re-log keeps the row id';
  assert m.weight_kg = 79.1 and m.waist_cm is null and m.hips_cm = 101, 're-log replaces values';
  begin
    perform public.log_body_metric(gen_random_uuid(), current_date + 5, 80);
    raise exception 'FAIL: future weigh-in accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.log_body_metric(gen_random_uuid(), current_date - 1, 500);
    raise exception 'FAIL: impossible weight accepted';
  exception when check_violation then null; end;
end $$;

-- Water is added atomically and clamped at zero.
do $$ begin
  assert public.add_water(current_date, 500) = 500, 'first glass';
  assert public.add_water(current_date, 250) = 750, 'adds up';
  assert public.add_water(current_date, -2000) = 0, 'never below zero';
  begin
    perform public.add_water(current_date, 5000);
    raise exception 'FAIL: absurd water change accepted';
  exception when invalid_parameter_value then null; end;
end $$;

-- A photo row can only point into the owner's own storage folder.
do $$ begin
  begin
    insert into public.progress_photos (user_id, taken_on, pose, storage_path)
    values ('11111111-1111-1111-1111-111111111111', current_date, 'front',
            '22222222-2222-2222-2222-222222222222/x.jpg');
    raise exception 'FAIL: photo path outside own folder accepted';
  exception when check_violation then null; end;
end $$;

-- The export contains only the caller's data, without user ids.
do $$ declare e jsonb := public.export_my_data(); begin
  assert e ->> 'format' = 'goal4me-export-v1', 'export is versioned';
  assert jsonb_array_length(e -> 'body_metrics') = 3, 'export has every weigh-in';
  assert jsonb_array_length(e -> 'workout_sessions') = 6, 'export has the workouts';
  assert not (e -> 'profiles' -> 0) ? 'user_id', 'user ids are stripped';
end $$;

-- Stage 5: first budget seeds 50/30/20 categories once; re-running only updates income.
select public.setup_budget(date_trunc('month', current_date)::date, 100000, 'USD') as _ \gset
select public.setup_budget(date_trunc('month', current_date)::date, 120000, 'USD') as _ \gset
do $$ begin
  assert (select income_minor from public.budgets where month = date_trunc('month', current_date)) = 120000,
    'budget income updated';
  -- Alice already had a 'Food' category, so no starter categories were added.
  assert (select count(*) from public.budget_categories) = 1, 'existing categories are kept';
  begin
    perform public.setup_budget(current_date + 1 - extract(day from current_date)::int + 1, 1, 'USD');
    raise exception 'FAIL: mid-month budget accepted';
  exception when invalid_parameter_value then null; end;
end $$;

-- Lessons: 30 seeded, completion keeps the best quiz score.
select public.complete_lesson((select id from public.lessons where slug = 'where-your-money-goes'), 1::smallint) as _ \gset
select public.complete_lesson((select id from public.lessons where slug = 'where-your-money-goes'), 3::smallint) as _ \gset
select public.complete_lesson((select id from public.lessons where slug = 'where-your-money-goes'), 2::smallint) as _ \gset
do $$ begin
  assert (select count(*) from public.lesson_catalog) = 30, 'thirty lessons listed';
  assert (select count(*) from public.lessons) = 3, 'free users can only open the free lessons';
  assert (select count(*) from public.lesson_catalog where not is_premium) = 3, 'three free lessons';
  assert (select quiz_score from public.lesson_progress) = 3, 'best quiz score kept';
  begin
    perform public.complete_lesson(gen_random_uuid(), 3::smallint);
    raise exception 'FAIL: unknown lesson accepted';
  exception when no_data_found then null; end;
end $$;

-- Stage 6: free users see the first 3 workout days of a premium programme only.
do $$ declare limit_day smallint; begin
  select public.free_day_limit(p.id) into limit_day from public.programs p where p.slug = 'fat-burn-home';
  assert limit_day = 5, format('3rd workout day of ARBRARB is day 5, got %s', limit_day);
  assert not public.is_premium_user(), 'Alice starts on the free tier';
  assert (select count(distinct d.day_number) from public.program_items i
            join public.program_days d on d.id = i.program_day_id
            join public.programs p on p.id = d.program_id
           where p.slug = 'fat-burn-home') = 3, 'three unlocked workouts';
end $$;

reset role;
insert into public.entitlements (user_id, product_id, store, is_active, expires_at)
values ('11111111-1111-1111-1111-111111111111', 'premium_yearly', 'paynow', true, now() + interval '1 year');
set local role authenticated;
do $$ begin
  assert public.is_premium_user(), 'premium after the entitlement is granted';
  assert (select count(*) from public.lessons) = 30, 'premium users open every lesson';
  assert (select count(distinct d.day_number) from public.program_items i
            join public.program_days d on d.id = i.program_day_id
            join public.programs p on p.id = d.program_id
           where p.slug = 'fat-burn-home') = 16, 'every workout day unlocked (16 of 28 are workouts)';
end $$;
reset role;
update public.entitlements set expires_at = now() - interval '1 day'
 where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
do $$ begin
  assert not public.is_premium_user(), 'an expired entitlement is not premium';
  assert (select count(*) from public.lessons) = 3, 'locked again after expiry';
end $$;

-- Running: guides gated like lessons; the first 3 runs of a plan are free.
insert into public.run_plans (id, program, settings)
values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'couch-to-5k', '{"program":"couch-to-5k","daysPerWeek":3}');
do $$ begin
  assert (select count(*) from public.run_guide_catalog) = 24, 'every guide title is listed';
  assert (select count(*) from public.run_guides) = 6, 'free users open the Starter guides only';
  assert public.log_run('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-0000000000a1',
                        1, 1, now() - interval '1 hour', 1800, 2500, 'hard', '  first run! ', 0.95),
    'first run logged';
  assert not public.log_run('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-0000000000a1',
                            1, 1, now() - interval '1 hour', 1800, 2500, 'hard', null, 0.95),
    'a retried sync is ignored';
  assert (select completed_runs from public.run_plans) = 1, 'plan advanced once';
  assert (select intensity from public.run_plans) = 0.95, 'intensity follows effort';
  assert (select notes from public.run_sessions) = 'first run!', 'notes trimmed';
  begin
    perform public.log_run(gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-0000000000a1',
                           4, 2, now(), 1800, null, 'easy', null, 1);
    raise exception 'FAIL: free user logged run 4';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.run_sessions (id, user_id, plan_id, run_number, week, started_at, duration_s, effort)
    values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
            'aaaaaaaa-0000-0000-0000-0000000000a1', 9, 3, now(), 1800, 'easy');
    raise exception 'FAIL: free user inserted run 9 directly';
  exception when insufficient_privilege then null; end;
  begin
    update public.run_sessions set duration_s = 60;
    if found then raise exception 'FAIL: runs are editable'; end if;
  exception when insufficient_privilege then null; end;
  begin
    insert into public.run_plans (program, settings) values ('5k-to-10k', '{"program":"5k-to-10k"}');
    raise exception 'FAIL: two active plans';
  exception when unique_violation then null; end;
  begin
    insert into public.run_plans (program, settings, is_active) values ('ultra', '{"program":"ultra"}', false);
    raise exception 'FAIL: unknown programme accepted';
  exception when check_violation then null; end;
  begin
    insert into public.run_guides (slug, level, position, title, body_md) values ('x', 'pro', 9, 'x', 'x');
    raise exception 'FAIL: user wrote a guide';
  exception when insufficient_privilege then null; end;
  assert jsonb_array_length(public.export_my_data() -> 'run_sessions') = 1, 'runs are exported';
end $$;
reset role;
do $$ begin
  assert (select current_days from public.streaks
           where user_id = '11111111-1111-1111-1111-111111111111') >= 1, 'a run counts for the streak';
end $$;
update public.entitlements set expires_at = now() + interval '1 day'
 where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
do $$ begin
  assert (select count(*) from public.run_guides) = 24, 'premium users open every guide';
  assert public.log_run(gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-0000000000a1',
                        4, 2, now(), 1800, null, 'easy', null, 1), 'premium users log run 4';
  assert (select completed_runs from public.run_plans) = 4, 'plan advanced to run 4';
end $$;

-- ---- Act as Bob -------------------------------------------------------------
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true) as _ \gset
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true) as _ \gset

do $$ begin
  assert (select count(*) from public.body_metrics) = 0, 'Bob must not see Alice''s metrics';
  assert (select count(*) from public.workout_sessions) = 0, 'Bob must not see Alice''s workouts';
  assert (select count(*) from public.profiles) = 1, 'Bob sees only his own profile';
  assert (select count(*) from public.run_plans) = 0, 'Bob must not see Alice''s run plan';
  assert (select count(*) from public.run_sessions) = 0, 'Bob must not see Alice''s runs';
  begin
    perform public.log_run(gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-0000000000a1',
                           1, 1, now(), 1800, null, 'easy', null, 1);
    raise exception 'FAIL: Bob logged a run on Alice''s plan';
  exception when invalid_parameter_value then null; end;

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

-- Bob's first budget gets the starter categories, limits from his income.
select public.setup_budget(date_trunc('month', current_date)::date, 200000, 'ZAR') as _ \gset
do $$ begin
  assert (select count(*) from public.budget_categories) = 8, 'eight starter categories';
  assert (select monthly_limit_minor from public.budget_categories where name = 'Housing') = 50000,
    'housing is 25% of income';
  assert (select sum(monthly_limit_minor) from public.budget_categories where bucket = 'needs') = 100000,
    'needs add up to 50%';
  assert (select sum(monthly_limit_minor) from public.budget_categories where bucket = 'wants') = 60000,
    'wants add up to 30%';
end $$;

-- Bob deletes his own account: refused while a photo file remains, then works.
do $$ declare e jsonb := public.export_my_data(); begin
  assert jsonb_array_length(e -> 'body_metrics') = 0, 'Bob''s export has none of Alice''s data';
end $$;
reset role;
insert into storage.objects (bucket_id, name)
values ('progress-photos', '22222222-2222-2222-2222-222222222222/front.jpg');
set local role authenticated;
do $$ begin
  begin
    perform public.delete_my_account();
    raise exception 'FAIL: deleted an account that still has photos';
  exception when raise_exception then null; end;
end $$;
reset role;
delete from storage.objects where name like '22222222-2222-2222-2222-222222222222/%';
set local role authenticated;
select public.delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '22222222-2222-2222-2222-222222222222'),
    'Bob deleted himself';
  assert exists (select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111'),
    'deleting Bob left Alice alone';
end $$;

-- ---- Back to the service role: account deletion cascades -------------------
reset role;
do $$ begin
  assert (select display_name from public.profiles
           where user_id = '11111111-1111-1111-1111-111111111111') is null,
         'Bob''s update must not touch Alice''s profile';
end $$;

-- A payment record must survive account deletion, detached from the user.
insert into public.paynow_payments (user_id, plan_id, amount_minor, reference, status)
values ('11111111-1111-1111-1111-111111111111', 'premium_yearly', 3999, 'G4M-TEST-1', 'paid');
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  assert (select count(*) from public.body_metrics) = 0, 'metrics deleted with the account';
  assert (select count(*) from public.workout_sessions) = 0, 'workouts deleted with the account';
  assert (select count(*) from public.content_audit_log
           where new_row ->> 'slug' in ('test-published', 'draft-move')) = 2, 'content inserts were audited';
end $$;

rollback;
\echo 'All database tests passed'
