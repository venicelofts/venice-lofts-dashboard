-- Itinerary dashboard schema + RLS

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can select own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- trips
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_user_id_idx on public.trips (user_id);
alter table public.trips enable row level security;

create policy "Users manage own trips"
  on public.trips for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- sources
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('email', 'file')),
  external_id text,
  content_hash text,
  path_or_subject text,
  last_scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, external_id),
  unique (user_id, content_hash)
);

create index if not exists sources_user_id_idx on public.sources (user_id);
alter table public.sources enable row level security;

create policy "Users manage own sources"
  on public.sources for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  text_snippet text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_source_id_idx on public.documents (source_id);
alter table public.documents enable row level security;

create policy "Users manage own documents"
  on public.documents for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid references public.sources (id) on delete set null,
  trip_id uuid references public.trips (id) on delete set null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  category text not null default 'other'
    check (category in ('flight', 'hotel', 'meeting', 'deadline', 'travel', 'other')),
  confidence real not null default 0.5 check (confidence >= 0 and confidence <= 1),
  excerpt text,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_needs_review_idx on public.events (user_id, needs_review);
alter table public.events enable row level security;

create policy "Users manage own events"
  on public.events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- scan_runs
create table if not exists public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  error text
);

create index if not exists scan_runs_user_id_idx on public.scan_runs (user_id, started_at desc);
alter table public.scan_runs enable row level security;

create policy "Users manage own scan_runs"
  on public.scan_runs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Realtime for dashboard updates
do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.scan_runs;
exception
  when duplicate_object then null;
end $$;
