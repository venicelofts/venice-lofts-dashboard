-- Track when an event was confirmed out of review.
alter table public.events
  add column if not exists cleared_at timestamptz;

create index if not exists events_cleared_at_idx
  on public.events (user_id, cleared_at desc)
  where cleared_at is not null;
