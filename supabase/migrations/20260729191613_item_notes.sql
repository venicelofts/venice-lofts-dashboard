-- One user note per source (survives event delete/re-insert on re-scan).

create table public.item_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id)
);

alter table public.item_notes enable row level security;

create policy "Authenticated manage shared item_notes"
  on public.item_notes for all to authenticated
  using (true)
  with check (true);
