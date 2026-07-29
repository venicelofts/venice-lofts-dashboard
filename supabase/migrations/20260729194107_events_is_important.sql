-- Flag events the ops team wants to keep front and center.

alter table public.events
  add column if not exists is_important boolean not null default false;

create index if not exists events_is_important_idx
  on public.events (is_important)
  where is_important = true;
