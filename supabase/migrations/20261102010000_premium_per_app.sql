-- =============================================================================
-- A separate Premium plan for each app.
--   * fit_premium   – Goal4Me Fit: every workout day, run and running guide
--   * money_premium – Goal4Me Money: every money lesson
-- Before the split one "premium" entitlement unlocked everything. Everyone
-- who paid for it keeps everything: each legacy row becomes one row per app,
-- with the same store, product and expiry.
-- Store and PayNow purchases from now on grant only the app they were made in.
-- =============================================================================

-- Existing subscribers keep both apps (copy, then remove the legacy row).
insert into public.entitlements (user_id, entitlement, product_id, store, is_active, expires_at,
                                 original_transaction_id, updated_at)
select e.user_id, app.entitlement, e.product_id, e.store, e.is_active, e.expires_at,
       e.original_transaction_id, now()
  from public.entitlements e
 cross join (values ('fit_premium'), ('money_premium')) as app (entitlement)
 where e.entitlement = 'premium'
on conflict (user_id, entitlement) do nothing;
delete from public.entitlements where entitlement = 'premium';

alter table public.entitlements
  alter column entitlement drop default,
  add constraint entitlements_entitlement_check
    check (entitlement in ('fit_premium', 'money_premium'));

-- Which plan a PayNow payment buys. Payments made before the split were for
-- the combined plan; they are history now, so they are recorded as Fit.
alter table public.paynow_payments
  add column entitlement text not null default 'fit_premium'
    check (entitlement in ('fit_premium', 'money_premium'));
alter table public.paynow_payments alter column entitlement drop default;

-- -----------------------------------------------------------------------------
-- Premium checks, per app
-- -----------------------------------------------------------------------------
create function public.has_entitlement(uid uuid, p_entitlement text) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements e
     where e.user_id = uid
       and e.entitlement = p_entitlement
       and e.is_active
       and (e.expires_at is null or e.expires_at > now())
  )
$$;
revoke execute on function public.has_entitlement(uuid, text) from public, anon, authenticated;
grant execute on function public.has_entitlement(uuid, text) to service_role;

-- The caller's own status only (they cannot probe other users).
create function public.is_fit_premium() returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select public.has_entitlement((select auth.uid()), 'fit_premium')
$$;
create function public.is_money_premium() returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select public.has_entitlement((select auth.uid()), 'money_premium')
$$;
revoke execute on function public.is_fit_premium, public.is_money_premium from public;
grant execute on function public.is_fit_premium, public.is_money_premium to anon, authenticated;

-- "Has any Premium" keeps its old meaning for anything still calling it.
create or replace function public.has_premium(uid uuid) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select public.has_entitlement(uid, 'fit_premium') or public.has_entitlement(uid, 'money_premium')
$$;

-- -----------------------------------------------------------------------------
-- Gated content: workouts and runs need Fit Premium, lessons Money Premium.
-- -----------------------------------------------------------------------------
drop policy "read unlocked days" on public.program_items;
create policy "read unlocked days" on public.program_items for select to anon, authenticated
  using (exists (
    select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
     where d.id = program_day_id
       and (not p.is_premium
            or d.day_number <= public.free_day_limit(p.id)
            or (select public.is_fit_premium())
            or (select public.is_admin()))
  ));

drop policy "read unlocked lessons" on public.lessons;
create policy "read unlocked lessons" on public.lessons for select to anon, authenticated
  using ((is_published and (not is_premium or (select public.is_money_premium())))
         or (select public.is_admin()));

drop policy "read unlocked guides" on public.run_guides;
create policy "read unlocked guides" on public.run_guides for select to anon, authenticated
  using ((is_published and (not is_premium or (select public.is_fit_premium())))
         or (select public.is_admin()));

drop policy "insert own unlocked runs" on public.run_sessions;
create policy "insert own unlocked runs" on public.run_sessions for insert to authenticated
  with check (user_id = (select auth.uid())
              and (run_number <= 3 or (select public.is_fit_premium())));

-- log_run checked premium itself; point it at Fit Premium.
do $$
declare
  src text := pg_get_functiondef('public.log_run(uuid, uuid, integer, integer, timestamptz, integer, integer, public.run_effort, text, numeric)'::regprocedure);
begin
  if position('not public.is_premium_user()' in src) = 0 then
    raise exception 'log_run no longer checks is_premium_user(); update this migration';
  end if;
  execute replace(src, 'not public.is_premium_user()', 'not public.is_fit_premium()');
end $$;

-- Nothing gates on "any Premium" any more.
drop function public.is_premium_user();
