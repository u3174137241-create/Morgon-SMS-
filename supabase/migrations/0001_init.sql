-- Bilkoll — initial schema
-- Kör med: supabase db push  (eller via Supabase MCP/CLI-migrationer)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: en rad per auth-användare, håller abonnemangsstatus.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Skapar automatiskt en profilrad när en användare registrerar sig.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- analyses: sparade bilanalyser. `listing` = rådata, `result` = validerad
-- Claude-utdata (samma form som features/analysis/schema.ts på klienten).
-- ---------------------------------------------------------------------------
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing jsonb not null,
  result jsonb not null,
  verdict text not null check (verdict in ('good_buy', 'caution', 'avoid')),
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_id_created_at_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

create policy "Users can view their own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own analyses"
  on public.analyses for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- analysis_requests: en rad per AI-anrop, används för server-side rate limit
-- och för att räkna månadskvot mot `profiles.subscription_tier`.
-- ---------------------------------------------------------------------------
create table if not exists public.analysis_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists analysis_requests_user_id_created_at_idx
  on public.analysis_requests (user_id, created_at desc);

alter table public.analysis_requests enable row level security;

create policy "Users can view their own request log"
  on public.analysis_requests for select
  using (auth.uid() = user_id);

-- Endast Edge Function (service role) skriver till analysis_requests,
-- så ingen insert-policy exponeras till klienten.

-- ---------------------------------------------------------------------------
-- Storage: bucket för uppladdade annonsbilder/screenshots.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', false)
on conflict (id) do nothing;

create policy "Users can upload their own listing images"
  on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view their own listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own listing images"
  on storage.objects for delete
  using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);
