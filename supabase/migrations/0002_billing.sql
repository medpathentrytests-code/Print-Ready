-- PrintReady — billing schema addition (Freemius live payments).
-- Run after 0001_init.sql:
--   supabase db push
-- or paste into the Supabase SQL editor.

alter table public.profiles
  add column if not exists billing_provider text check (billing_provider in ('freemius')),
  add column if not exists billing_ref text, -- Freemius license ID
  add column if not exists plan_expires_at timestamptz;

create index if not exists profiles_billing_ref_idx on public.profiles(billing_ref);

-- ---------------------------------------------------------------------------
-- payments (append-only ledger of real, completed/attempted charges)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('freemius')),
  provider_ref text not null, -- Freemius license ID
  plan text not null check (plan in ('pro', 'business')),
  amount numeric not null,
  currency text not null check (currency in ('USD')),
  status text not null check (status in ('pending', 'completed', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_provider_ref_idx on public.payments(provider_ref);

alter table public.payments enable row level security;

create policy "Users view their own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- No insert/update policy for regular users — all writes happen server-side
-- via the service-role key after a verified Freemius purchase (confirmed by
-- an authenticated server-to-server call to the Freemius API, and/or a
-- signed webhook event — see lib/billing/freemius.ts).
