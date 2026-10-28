-- =============================================================================
-- Stage 6: premium gating enforced in the database, not just the app.
--   Free tier (spec: Monetisation): quiz + results, weight logging, the first
--   3 workouts of every programme and 3 money lessons.
--   * is_premium_user()  – the caller's own premium status (cannot probe others)
--   * program_items      – exercises of locked days are hidden from free users
--   * lessons            – bodies/quizzes of premium lessons are hidden; the
--                          lesson_catalog view still lists every title
-- Entitlements themselves are written only by Edge Functions (service role).
-- =============================================================================

create function public.is_premium_user() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_premium((select auth.uid()))
$$;
revoke execute on function public.is_premium_user from public;
grant execute on function public.is_premium_user to anon, authenticated;

-- Day number of a programme's 3rd workout day (rest days don't count).
create function public.free_day_limit(p_program_id uuid) returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(day_number), 0)::smallint from (
    select d.day_number from public.program_days d
     where d.program_id = p_program_id and not d.is_rest_day
     order by d.day_number
     limit 3
  ) first_three
$$;
grant execute on function public.free_day_limit to anon, authenticated;

drop policy "read with program" on public.program_items;
create policy "read unlocked days" on public.program_items for select to anon, authenticated
  using (exists (
    select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
     where d.id = program_day_id
       and (not p.is_premium
            or d.day_number <= public.free_day_limit(p.id)
            or (select public.is_premium_user())
            or (select public.is_admin()))
  ));

drop policy "read published" on public.lessons;
create policy "read unlocked lessons" on public.lessons for select to anon, authenticated
  using ((is_published and (not is_premium or (select public.is_premium_user())))
         or (select public.is_admin()));

-- Titles and order of every published lesson, so the app can show locked
-- lessons. Runs as the view owner, but exposes metadata only.
create view public.lesson_catalog with (security_invoker = false) as
  select id, slug, track, position, title, is_premium
    from public.lessons
   where is_published;
grant select on public.lesson_catalog to anon, authenticated;
