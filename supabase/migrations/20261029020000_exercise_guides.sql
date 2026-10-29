-- =============================================================================
-- How-to guide for each exercise: steps, breathing, common mistakes and why it
-- helps. Shown in the workout overview and the in-workout "How to do it" sheet.
-- Content is seeded from packages/content (20261029030000_seed_exercise_guides).
-- =============================================================================

alter table public.exercises
  add column steps text[] not null default '{}'
    check (cardinality(steps) <= 6),
  add column breathing text not null default ''
    check (char_length(breathing) <= 200),
  add column mistakes text[] not null default '{}'
    check (cardinality(mistakes) <= 4),
  add column benefit text not null default ''
    check (char_length(benefit) <= 200);

comment on column public.exercises.steps is 'One rep, start to finish, in order.';
comment on column public.exercises.mistakes is 'Most common mistakes, each with its fix.';
