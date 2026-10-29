-- =============================================================================
-- Stage 4: progress tracking and account self-service.
--   * log_body_metric   – one weigh-in (plus optional measurements) per day
--   * add_water         – atomic +/- on today's water total
--   * export_my_data    – everything we hold about the caller, as JSON
--   * delete_my_account – permanent, self-service deletion (App Store rule 5.1.1(v))
-- Payment records are kept (anonymised) after deletion for tax/accounting.
-- =============================================================================

-- Photos must live in the owner's folder, so a row can never point at
-- somebody else's file even if the storage policy were misconfigured.
alter table public.progress_photos
  add constraint progress_photos_path_in_own_folder
  check (storage_path like user_id::text || '/%');

-- Financial records must survive account deletion (accounting retention), so
-- detach them from the user instead of cascading.
alter table public.paynow_payments alter column user_id drop not null;
alter table public.paynow_payments drop constraint paynow_payments_user_id_fkey;
alter table public.paynow_payments
  add constraint paynow_payments_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

-- -----------------------------------------------------------------------------
-- log_body_metric: insert or replace the entry for that day. The id is created
-- on the device; on a same-day re-log the existing row keeps its id.
-- -----------------------------------------------------------------------------
create function public.log_body_metric(
  p_id uuid,
  p_measured_on date,
  p_weight_kg numeric,
  p_waist_cm numeric default null,
  p_hips_cm numeric default null,
  p_chest_cm numeric default null,
  p_arm_cm numeric default null
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
  -- One day of slack covers every time zone ahead of the server.
  if p_measured_on > current_date + 1 then
    raise exception 'measurement date is in the future' using errcode = '22023';
  end if;

  insert into public.body_metrics (id, user_id, measured_on, weight_kg, waist_cm, hips_cm, chest_cm, arm_cm)
  values (p_id, uid, p_measured_on, p_weight_kg, p_waist_cm, p_hips_cm, p_chest_cm, p_arm_cm)
  on conflict (user_id, measured_on) do update
     set weight_kg = excluded.weight_kg,
         waist_cm = excluded.waist_cm,
         hips_cm = excluded.hips_cm,
         chest_cm = excluded.chest_cm,
         arm_cm = excluded.arm_cm;
end;
$$;

-- -----------------------------------------------------------------------------
-- add_water: a single UPDATE avoids lost increments when the user taps fast
-- on two devices. Clamped to the table's 0–10 000 ml check. Returns the total.
-- -----------------------------------------------------------------------------
create function public.add_water(p_log_date date, p_delta_ml integer) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  total integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_delta_ml not between -2000 and 2000 then
    raise exception 'water change out of range' using errcode = '22023';
  end if;

  insert into public.daily_logs (user_id, log_date, water_ml)
  values (uid, p_log_date, greatest(0, least(10000, p_delta_ml)))
  on conflict (user_id, log_date) do update
     set water_ml = greatest(0, least(10000, coalesce(public.daily_logs.water_ml, 0) + p_delta_ml))
  returning water_ml into total;
  return total;
end;
$$;

-- -----------------------------------------------------------------------------
-- export_my_data: GDPR / POPIA data-portability export. Runs as the caller,
-- so RLS guarantees it can only ever return the caller's own rows.
-- -----------------------------------------------------------------------------
create function public.export_my_data() returns jsonb
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
                           'paynow_payments']
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(r) - ''user_id''), ''[]''::jsonb) from public.%I r where r.user_id = $1', t)
      into rows using uid;
    result := result || jsonb_build_object(t, rows);
  end loop;
  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- delete_my_account: removes the auth user; every user-owned table cascades.
-- Storage files cannot be deleted from SQL on Supabase, so the app removes the
-- caller's photos through the Storage API first and we refuse to continue
-- while any remain (no orphaned personal images).
-- -----------------------------------------------------------------------------
create function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from storage.objects o
              where o.bucket_id = 'progress-photos'
                and (storage.foldername(o.name))[1] = uid::text) then
    raise exception 'progress photos must be removed first' using errcode = 'P0001',
      hint = 'photos_remaining';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.log_body_metric, public.add_water, public.export_my_data,
  public.delete_my_account from public, anon;
grant execute on function public.log_body_metric, public.add_water, public.export_my_data,
  public.delete_my_account to authenticated;
