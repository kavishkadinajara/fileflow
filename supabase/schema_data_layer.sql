-- ─────────────────────────────────────────────────────────────────────────────
-- FileFlowOne — Data Layer (presets, history, ATS scans, shares)
-- Privacy-by-design: stores metadata + scores only. Document content is NEVER
-- stored, except opt-in shareable results which auto-expire.
-- Run AFTER schema.sql in: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Shared updated_at trigger (defined in schema.sql as set_updated_at). If you run
-- this file standalone, uncomment the function below.
-- create or replace function public.set_updated_at() ... (see schema.sql)

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. user_presets — saved conversion settings
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.user_presets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null check (length(name) between 1 and 80),
  from_format  text not null,
  to_format    text not null,
  options      jsonb not null default '{}'::jsonb,
  is_default   boolean not null default false,
  use_count    integer not null default 0 check (use_count >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists user_presets_user_id_idx on public.user_presets(user_id);
-- One default preset per (user, from→to) pair.
create unique index if not exists user_presets_one_default_idx
  on public.user_presets(user_id, from_format, to_format)
  where is_default = true;

alter table public.user_presets enable row level security;

drop policy if exists "presets: owner select" on public.user_presets;
create policy "presets: owner select" on public.user_presets
  for select using (auth.uid() = user_id);

drop policy if exists "presets: owner insert" on public.user_presets;
create policy "presets: owner insert" on public.user_presets
  for insert with check (auth.uid() = user_id);

drop policy if exists "presets: owner update" on public.user_presets;
create policy "presets: owner update" on public.user_presets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "presets: owner delete" on public.user_presets;
create policy "presets: owner delete" on public.user_presets
  for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.user_presets;
create trigger set_updated_at before update on public.user_presets
  for each row execute function public.set_updated_at();


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. conversion_history — metadata only, NO file content
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.conversion_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source_format text not null,
  target_format text not null,
  source_name   text not null default '' check (length(source_name) <= 255),
  size_bytes    bigint not null default 0 check (size_bytes >= 0),
  status        text not null default 'done'
                  check (status in ('done', 'error')),
  duration_ms   integer not null default 0 check (duration_ms >= 0),
  created_at    timestamptz not null default now()
);

create index if not exists conversion_history_user_id_idx
  on public.conversion_history(user_id, created_at desc);
create index if not exists conversion_history_formats_idx
  on public.conversion_history(source_format, target_format);

alter table public.conversion_history enable row level security;

drop policy if exists "history: owner select" on public.conversion_history;
create policy "history: owner select" on public.conversion_history
  for select using (auth.uid() = user_id);

drop policy if exists "history: owner insert" on public.conversion_history;
create policy "history: owner insert" on public.conversion_history
  for insert with check (auth.uid() = user_id);

drop policy if exists "history: owner delete" on public.conversion_history;
create policy "history: owner delete" on public.conversion_history
  for delete using (auth.uid() = user_id);


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. ats_scans — scores + JD hash only, NO résumé / NO JD text
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.ats_scans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  resume_name      text not null default '' check (length(resume_name) <= 255),
  jd_hash          char(64) not null,                       -- sha-256 of JD, one-way
  overall          integer not null check (overall between 0 and 100),
  score_keyword    integer not null check (score_keyword between 0 and 100),
  score_skills     integer not null check (score_skills between 0 and 100),
  score_similarity integer not null check (score_similarity between 0 and 100),
  score_format     integer not null check (score_format between 0 and 100),
  created_at       timestamptz not null default now()
);

create index if not exists ats_scans_user_id_idx
  on public.ats_scans(user_id, created_at desc);

alter table public.ats_scans enable row level security;

drop policy if exists "scans: owner select" on public.ats_scans;
create policy "scans: owner select" on public.ats_scans
  for select using (auth.uid() = user_id);

drop policy if exists "scans: owner insert" on public.ats_scans;
create policy "scans: owner insert" on public.ats_scans
  for insert with check (auth.uid() = user_id);

drop policy if exists "scans: owner delete" on public.ats_scans;
create policy "scans: owner delete" on public.ats_scans
  for delete using (auth.uid() = user_id);


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. ats_scan_skills — junction table (1 scan : N skills) — normalization (3NF)
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.ats_scan_skills (
  id        uuid primary key default gen_random_uuid(),
  scan_id   uuid not null references public.ats_scans(id) on delete cascade,
  skill     text not null check (length(skill) between 1 and 80),
  matched   boolean not null,                 -- true = in CV, false = missing gap
  category  text not null default 'other'
);

create index if not exists ats_scan_skills_scan_id_idx on public.ats_scan_skills(scan_id);
create index if not exists ats_scan_skills_gap_idx
  on public.ats_scan_skills(skill) where matched = false;

alter table public.ats_scan_skills enable row level security;

-- Child rows are visible/insertable only when the parent scan belongs to the user.
drop policy if exists "scan_skills: via owner scan select" on public.ats_scan_skills;
create policy "scan_skills: via owner scan select" on public.ats_scan_skills
  for select using (exists (
    select 1 from public.ats_scans a
    where a.id = scan_id and a.user_id = auth.uid()
  ));

drop policy if exists "scan_skills: via owner scan insert" on public.ats_scan_skills;
create policy "scan_skills: via owner scan insert" on public.ats_scan_skills
  for insert with check (exists (
    select 1 from public.ats_scans a
    where a.id = scan_id and a.user_id = auth.uid()
  ));


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. shared_results — opt-in temporary share, mandatory TTL
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.shared_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,  -- nullable: anon shares ok
  format      text not null,
  content     bytea not null,                                    -- the ONLY stored content
  size_bytes  bigint not null default 0 check (size_bytes >= 0),
  views       integer not null default 0 check (views >= 0),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  constraint shared_results_ttl check (expires_at > created_at)
);

create index if not exists shared_results_expires_idx on public.shared_results(expires_at);

alter table public.shared_results enable row level security;

-- Anyone may read a share BY ID while it is still alive (that's the share link).
drop policy if exists "shares: public read while alive" on public.shared_results;
create policy "shares: public read while alive" on public.shared_results
  for select using (expires_at > now());

-- Authenticated users create their own shares; anon shares go through an RPC.
drop policy if exists "shares: owner insert" on public.shared_results;
create policy "shares: owner insert" on public.shared_results
  for insert with check (auth.uid() = user_id);

drop policy if exists "shares: owner delete" on public.shared_results;
create policy "shares: owner delete" on public.shared_results
  for delete using (auth.uid() = user_id);


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. record_ats_scan — atomic scan + skills insert (transaction)
-- ═════════════════════════════════════════════════════════════════════════════
-- Inserts the scan header and all skill rows in ONE transaction. If any skill
-- row violates a constraint, the whole scan rolls back — never a header without
-- its details. `skills` is a jsonb array of {skill, matched, category}.

create or replace function public.record_ats_scan(
  p_resume_name      text,
  p_jd_hash          char(64),
  p_overall          integer,
  p_score_keyword    integer,
  p_score_skills     integer,
  p_score_similarity integer,
  p_score_format     integer,
  p_skills           jsonb
) returns uuid
language plpgsql
security invoker          -- runs as the caller → RLS still applies
set search_path = public
as $$
declare
  v_scan_id uuid;
begin
  insert into public.ats_scans(
    user_id, resume_name, jd_hash, overall,
    score_keyword, score_skills, score_similarity, score_format
  ) values (
    auth.uid(), p_resume_name, p_jd_hash, p_overall,
    p_score_keyword, p_score_skills, p_score_similarity, p_score_format
  )
  returning id into v_scan_id;

  insert into public.ats_scan_skills(scan_id, skill, matched, category)
  select v_scan_id,
         (e ->> 'skill')::text,
         (e ->> 'matched')::boolean,
         coalesce(e ->> 'category', 'other')
  from jsonb_array_elements(p_skills) as e;

  return v_scan_id;
end;
$$;

grant execute on function public.record_ats_scan(
  text, char, integer, integer, integer, integer, integer, jsonb
) to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. popular_formats — admin analytics aggregate (no row-level user data)
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.popular_formats(p_limit integer default 20)
returns table(source_format text, target_format text, runs bigint)
language sql
security definer
set search_path = public
as $$
  select source_format, target_format, count(*) as runs
  from public.conversion_history
  group by source_format, target_format
  order by runs desc
  limit p_limit;
$$;

grant execute on function public.popular_formats(integer) to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 8. purge_expired_shares — TTL cleanup (schedule via pg_cron every 15 min)
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.purge_expired_shares()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.shared_results where expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Schedule (run once, requires the pg_cron extension enabled in Supabase):
-- select cron.schedule('purge-expired-shares', '*/15 * * * *',
--                      $$ select public.purge_expired_shares(); $$);
