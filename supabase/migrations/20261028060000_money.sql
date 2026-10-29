-- =============================================================================
-- Stage 5: money module.
--   * setup_budget     – create/update a month's budget; first time also seeds
--                        default categories with 50/30/20 limits
--   * complete_lesson  – record a finished lesson, keeping the best quiz score
-- Transactions, savings goals and contributions are written directly by the
-- app: RLS plus the composite foreign keys already guarantee ownership.
-- =============================================================================

create function public.setup_budget(
  p_month date,
  p_income_minor bigint,
  p_currency char(3)
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  budget_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_month <> date_trunc('month', p_month)::date then
    raise exception 'month must be the first day of a month' using errcode = '22023';
  end if;

  insert into public.budgets (user_id, month, income_minor, currency)
  values (uid, p_month, p_income_minor, p_currency)
  on conflict (user_id, month) do update
     set income_minor = excluded.income_minor,
         currency = excluded.currency,
         updated_at = now()
  returning id into budget_id;

  -- First budget ever: starter categories. Shares of income add up to
  -- 50% needs and 30% wants; savings are tracked through savings goals,
  -- so "Extra debt payments" has no limit.
  if not exists (select 1 from public.budget_categories where user_id = uid) then
    insert into public.budget_categories (user_id, name, bucket, monthly_limit_minor)
    select uid, c.name, c.bucket::public.budget_bucket,
           case when c.share is null then null else round(p_income_minor * c.share)::bigint end
      from (values
        ('Housing', 'needs', 0.25),
        ('Groceries', 'needs', 0.12),
        ('Transport', 'needs', 0.08),
        ('Utilities and airtime', 'needs', 0.05),
        ('Eating out', 'wants', 0.12),
        ('Entertainment', 'wants', 0.10),
        ('Shopping', 'wants', 0.08),
        ('Extra debt payments', 'savings', null)
      ) as c(name, bucket, share);
  end if;

  return budget_id;
end;
$$;

create function public.complete_lesson(p_lesson_id uuid, p_quiz_score smallint) returns void
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
  -- RLS on lessons hides unpublished rows, so this also rejects drafts.
  if not exists (select 1 from public.lessons where id = p_lesson_id) then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  insert into public.lesson_progress (user_id, lesson_id, quiz_score)
  values (uid, p_lesson_id, p_quiz_score)
  on conflict (user_id, lesson_id) do update
     set quiz_score = greatest(public.lesson_progress.quiz_score, excluded.quiz_score);
end;
$$;

revoke execute on function public.setup_budget, public.complete_lesson from public, anon;
grant execute on function public.setup_budget, public.complete_lesson to authenticated;
