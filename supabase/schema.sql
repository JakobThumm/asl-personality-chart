-- ASL Personality Chart — Supabase schema.
-- Run this once in your Supabase project: SQL Editor -> New query -> paste -> Run.
--
-- Privacy model: individual answers are NEVER stored. The submit_result() function
-- folds them into anonymous per-question counts and discards them. The public
-- "anon" key can only read the chart data and call submit_result(); it cannot read
-- or write anything else, because Row Level Security blocks direct table writes and
-- there is no answer data to read.

-- ---------- Tables ----------

create table if not exists public.results (
  id          bigint generated always as identity primary key,
  name        text not null,
  emoji       text not null,
  x           double precision not null,
  y           double precision not null,
  created_at  timestamptz not null default now()
);

-- One entry per name (case-insensitive); retaking overwrites the spot.
create unique index if not exists results_name_lower_idx
  on public.results (lower(name));

-- Anonymous per-question Likert counts. One row per question index (0-based).
create table if not exists public.distributions (
  question_index int primary key,
  sd int not null default 0,  -- strongly disagree
  d  int not null default 0,  -- disagree
  n  int not null default 0,  -- neutral
  a  int not null default 0,  -- agree
  sa int not null default 0   -- strongly agree
);

-- ---------- Row Level Security ----------

alter table public.results       enable row level security;
alter table public.distributions enable row level security;

-- The page (anon) may READ the chart data...
drop policy if exists "anon read results" on public.results;
create policy "anon read results"
  on public.results for select to anon using (true);

drop policy if exists "anon read distributions" on public.distributions;
create policy "anon read distributions"
  on public.distributions for select to anon using (true);

-- ...but anon has NO insert/update/delete policy, so it cannot write directly.
-- All writes go through submit_result() below, which runs as the function owner.

-- ---------- Submission function ----------

create or replace function public.submit_result(
  p_name    text,
  p_emoji   text,
  p_x       double precision,
  p_y       double precision,
  p_answers double precision[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text := left(trim(coalesce(p_name, '')), 24);
  v_emoji  text := left(trim(coalesce(p_emoji, '')), 8);
  v_is_new boolean;
  v_idx    int;
  v_val    double precision;
  v_bucket int;
begin
  if v_name = '' or v_emoji = '' then
    raise exception 'name and emoji are required';
  end if;
  if p_x < -1.001 or p_x > 1.001 or p_y < -1.001 or p_y > 1.001 then
    raise exception 'position out of range';
  end if;

  -- Is this a brand-new participant (vs. a retake)?
  select not exists (
    select 1 from results where lower(name) = lower(v_name)
  ) into v_is_new;

  -- Upsert the position (dedupe by lower(name)). Answers are NOT stored.
  delete from results where lower(name) = lower(v_name);
  insert into results (name, emoji, x, y)
    values (v_name, v_emoji,
            greatest(-1, least(1, p_x)),
            greatest(-1, least(1, p_y)));

  -- Aggregate answers only for new participants, so each question's total
  -- equals the participant count. Multiplier -> bucket: -1->sd ... 1->sa.
  if v_is_new and p_answers is not null then
    for v_idx in 1 .. coalesce(array_length(p_answers, 1), 0) loop
      v_val := p_answers[v_idx];
      if v_val not in (-1, -0.5, 0, 0.5, 1) then
        continue;
      end if;
      v_bucket := round((v_val + 1) * 2)::int;  -- 0..4

      insert into distributions (question_index)
        values (v_idx - 1)
        on conflict (question_index) do nothing;

      update distributions set
        sd = sd + (case when v_bucket = 0 then 1 else 0 end),
        d  = d  + (case when v_bucket = 1 then 1 else 0 end),
        n  = n  + (case when v_bucket = 2 then 1 else 0 end),
        a  = a  + (case when v_bucket = 3 then 1 else 0 end),
        sa = sa + (case when v_bucket = 4 then 1 else 0 end)
      where question_index = v_idx - 1;
    end loop;
  end if;
end;
$$;

-- Let the page call the function, but nothing else.
revoke all on function public.submit_result(text, text, double precision, double precision, double precision[]) from public;
grant execute on function public.submit_result(text, text, double precision, double precision, double precision[]) to anon;
