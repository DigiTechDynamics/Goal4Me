-- =============================================================================
-- log_workout: records a finished workout and advances the user's programme
-- in one transaction. Idempotent: the session id is generated on the device,
-- so a retried sync (e.g. after being offline) never double-counts.
-- Runs as the caller, so RLS and CHECK constraints still apply.
-- =============================================================================
create function public.log_workout(
  p_session_id uuid,
  p_program_day_id uuid,
  p_started_at timestamptz,
  p_duration_s integer,
  p_kcal_est integer,
  p_rating public.workout_rating,
  p_next_intensity numeric
) returns boolean
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
  if p_started_at > now() + interval '5 minutes' then
    raise exception 'workout cannot start in the future' using errcode = '22023';
  end if;

  insert into public.workout_sessions (id, user_id, program_day_id, started_at, duration_s, kcal_est, rating)
  values (p_session_id, uid, p_program_day_id, p_started_at, p_duration_s, p_kcal_est, p_rating)
  on conflict (id) do nothing;

  if not found then
    return false;  -- already logged earlier: nothing else to do
  end if;

  -- Advance the active programme when this day is the one the user is on (or ahead).
  update public.user_programs up
     set current_day = least(pd.day_number + 1, p.duration_days),
         intensity_factor = least(2, greatest(0.5, coalesce(p_next_intensity, up.intensity_factor))),
         completed_at = case when pd.day_number >= p.duration_days then now() else up.completed_at end
    from public.program_days pd
    join public.programs p on p.id = pd.program_id
   where pd.id = p_program_day_id
     and up.program_id = pd.program_id
     and up.user_id = uid
     and up.is_active
     and pd.day_number >= up.current_day;

  return true;
end;
$$;

revoke execute on function public.log_workout from public, anon;
grant execute on function public.log_workout to authenticated;
