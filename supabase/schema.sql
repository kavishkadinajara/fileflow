-- ─────────────────────────────────────────────────────────────────────────────
-- FileFlowOne — Style Templates Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Templates table -------------------------------------------------------------

create table if not exists public.style_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (length(name) between 1 and 80),
  description   text not null default '' check (length(description) <= 500),
  category      text not null default 'minimal',
  tags          text[] not null default array[]::text[],
  config        jsonb not null,
  is_public     boolean not null default false,
  fork_count    integer not null default 0,
  forked_from   uuid references public.style_templates(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists style_templates_user_id_idx     on public.style_templates(user_id);
create index if not exists style_templates_is_public_idx   on public.style_templates(is_public);
create index if not exists style_templates_category_idx    on public.style_templates(category);
create index if not exists style_templates_fork_count_idx  on public.style_templates(fork_count desc);

-- Row-Level Security ----------------------------------------------------------

alter table public.style_templates enable row level security;

-- Anyone (including anon) can read public templates.
drop policy if exists "Public templates are readable by anyone" on public.style_templates;
create policy "Public templates are readable by anyone"
  on public.style_templates
  for select
  using (is_public = true);

-- Owners can read their own templates (public or private).
drop policy if exists "Owners can read their own templates" on public.style_templates;
create policy "Owners can read their own templates"
  on public.style_templates
  for select
  using (auth.uid() = user_id);

-- Owners can create templates owned by themselves.
drop policy if exists "Authenticated users can create their own templates" on public.style_templates;
create policy "Authenticated users can create their own templates"
  on public.style_templates
  for insert
  with check (auth.uid() = user_id);

-- Owners can update their own templates.
drop policy if exists "Owners can update their own templates" on public.style_templates;
create policy "Owners can update their own templates"
  on public.style_templates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Owners can delete their own templates.
drop policy if exists "Owners can delete their own templates" on public.style_templates;
create policy "Owners can delete their own templates"
  on public.style_templates
  for delete
  using (auth.uid() = user_id);

-- Anyone can increment fork_count on a public template (used by forkTemplate).
-- We allow public update of fork_count only — but row-level UPDATE policy
-- gates the whole row. So we expose a SECURITY DEFINER function instead.
create or replace function public.increment_fork_count(template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.style_templates
     set fork_count = fork_count + 1
   where id = template_id and is_public = true;
end;
$$;

grant execute on function public.increment_fork_count(uuid) to anon, authenticated;

-- Auto-update updated_at on row change ----------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.style_templates;
create trigger set_updated_at
  before update on public.style_templates
  for each row execute function public.set_updated_at();
