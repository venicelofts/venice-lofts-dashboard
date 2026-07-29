-- Allow Outlook calendar sources alongside email and file.

alter table public.sources
  drop constraint if exists sources_kind_check;

alter table public.sources
  add constraint sources_kind_check
  check (kind in ('email', 'file', 'calendar'));
