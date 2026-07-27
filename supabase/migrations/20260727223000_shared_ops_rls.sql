-- Shared ops data: any authenticated user can read/write itinerary tables.
-- Scans still write under SCAN_USER_ID; dashboards no longer scope by auth.uid().

drop policy if exists "Users manage own trips" on public.trips;
drop policy if exists "Users manage own sources" on public.sources;
drop policy if exists "Users manage own documents" on public.documents;
drop policy if exists "Users manage own events" on public.events;
drop policy if exists "Users manage own scan_runs" on public.scan_runs;

drop policy if exists "Authenticated manage shared trips" on public.trips;
drop policy if exists "Authenticated manage shared sources" on public.sources;
drop policy if exists "Authenticated manage shared documents" on public.documents;
drop policy if exists "Authenticated manage shared events" on public.events;
drop policy if exists "Authenticated manage shared scan_runs" on public.scan_runs;

create policy "Authenticated manage shared trips"
  on public.trips for all to authenticated
  using (true)
  with check (true);

create policy "Authenticated manage shared sources"
  on public.sources for all to authenticated
  using (true)
  with check (true);

create policy "Authenticated manage shared documents"
  on public.documents for all to authenticated
  using (true)
  with check (true);

create policy "Authenticated manage shared events"
  on public.events for all to authenticated
  using (true)
  with check (true);

create policy "Authenticated manage shared scan_runs"
  on public.scan_runs for all to authenticated
  using (true)
  with check (true);
