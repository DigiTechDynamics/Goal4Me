-- =============================================================================
-- complete_onboarding: saves the quiz in ONE transaction (profile, current
-- goal, first weight entry, starting programme), so a dropped connection can
-- never leave a half-onboarded account. Runs as the caller (security invoker),
-- so every write still goes through RLS and the table CHECK constraints.
-- =============================================================================
create function public.complete_onboarding(
  p_sex public.sex,
  p_birth_date date,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_units text,
  p_country char(2),
  p_currency char(3),
  p_timezone text,
  p_goal public.goal_type,
  p_target_weight_kg numeric,
  p_activity public.activity_level,
  p_fitness_level public.fitness_level,
  p_problem_areas text[],
  p_limitations text[],
  p_days_per_week smallint,
  p_minutes_per_session smallint,
  p_money_goal text,
  p_program_slug text,
  p_guardian_consent boolean
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone coalesce(nullif(p_timezone, ''), 'UTC'))::date;
  program uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- Reject unknown time zones early with a clear message.
  perform now() at time zone p_timezone;

  update public.profiles set
    sex = p_sex,
    birth_date = p_birth_date,
    height_cm = p_height_cm,
    units = p_units,
    country = p_country,
    currency = p_currency,
    timezone = p_timezone,
    health_consent_at = coalesce(health_consent_at, now()),
    disclaimer_accepted_at = coalesce(disclaimer_accepted_at, now()),
    guardian_consent_at = case when p_guardian_consent then coalesce(guardian_consent_at, now()) end
  where user_id = uid;

  update public.goals set is_current = false where user_id = uid and is_current;
  insert into public.goals (user_id, goal, target_weight_kg, activity, fitness_level, problem_areas,
                            limitations, days_per_week, minutes_per_session, money_goal)
  values (uid, p_goal, p_target_weight_kg, p_activity, p_fitness_level, p_problem_areas,
          p_limitations, p_days_per_week, p_minutes_per_session, p_money_goal);

  insert into public.body_metrics (id, user_id, measured_on, weight_kg)
  values (gen_random_uuid(), uid, today, p_weight_kg)
  on conflict (user_id, measured_on) do update set weight_kg = excluded.weight_kg;

  -- Start the recommended programme if it has been published.
  select id into program from public.programs where slug = p_program_slug and is_published;
  if program is not null then
    update public.user_programs set is_active = false where user_id = uid and is_active;
    insert into public.user_programs (user_id, program_id, started_on)
    values (uid, program, today);
  end if;
end;
$$;

revoke execute on function public.complete_onboarding from public, anon;
grant execute on function public.complete_onboarding to authenticated;
