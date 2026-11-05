-- PrintReady — Supabase production schema
-- Run this once against a fresh Supabase project:
--   supabase db push
-- or paste it into the Supabase SQL editor.
--
-- This schema assumes Supabase Auth (auth.users) owns authentication.
-- `profiles` extends auth.users with product-specific fields (plan, admin flag).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free','pro','business')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Automatically create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);

alter table public.projects enable row level security;

create policy "Users manage their own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- inspections
-- ---------------------------------------------------------------------------
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  job_id text not null,
  document_name text not null,
  file_size_bytes bigint not null,
  spec_key text,
  spec_label text,
  target_width_in numeric,
  target_height_in numeric,
  bleed_in numeric,
  margin_in numeric,
  page_count int not null default 0,
  score int not null default 0,
  critical_count int not null default 0,
  warning_count int not null default 0,
  info_count int not null default 0,
  passed_checks int not null default 0,
  total_checks int not null default 10,
  issues_json jsonb not null default '[]',
  pages_json jsonb not null default '[]',
  thumbnails_json jsonb not null default '[]',
  is_encrypted boolean not null default false,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists inspections_user_id_idx on public.inspections(user_id);
create index if not exists inspections_project_id_idx on public.inspections(project_id);

alter table public.inspections enable row level security;

create policy "Users manage their own inspections"
  on public.inspections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- usage_counters (monthly plan-limit enforcement)
-- ---------------------------------------------------------------------------
create table if not exists public.usage_counters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null, -- 'YYYY-MM'
  inspections_used int not null default 0,
  primary key (user_id, period)
);

alter table public.usage_counters enable row level security;

create policy "Users view their own usage"
  on public.usage_counters for select
  using (auth.uid() = user_id);

create or replace function public.increment_usage_counter(p_user_id uuid, p_period text)
returns void as $$
begin
  insert into public.usage_counters (user_id, period, inspections_used)
  values (p_user_id, p_period, 1)
  on conflict (user_id, period)
  do update set inspections_used = public.usage_counters.inspections_used + 1;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- processing_failures (admin visibility only — no RLS select policy for users)
-- ---------------------------------------------------------------------------
create table if not exists public.processing_failures (
  id uuid primary key default gen_random_uuid(),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.processing_failures enable row level security;
-- Intentionally no select policy for regular users; service-role key (used
-- server-side only) bypasses RLS for admin dashboard queries.

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded PDFs + generated thumbnails (production)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('printready-uploads', 'printready-uploads', false)
on conflict (id) do nothing;

create policy "Users access their own storage objects"
  on storage.objects for all
  using (bucket_id = 'printready-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'printready-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
