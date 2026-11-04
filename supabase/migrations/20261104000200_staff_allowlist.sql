-- Staff allowlist. Before this, every authenticated user had staff rights,
-- so an enabled public sign-up meant anyone could create an account and
-- bid, sell, or read reserves. Now only users listed in public.staff can
-- write; a self-registered account gets the same read-only access as anon.
--
-- Also adds the missing storage SELECT policy: Storage needs it for
-- list() and remove(), so photo deletions silently did nothing.

create table public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;
-- No policies: the table is managed from the dashboard / SQL editor only.

-- Every user that exists when this migration runs becomes staff. Check
-- Authentication -> Users first and delete any account that is not staff.
insert into public.staff (user_id) select id from auth.users;

create function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

-- ----------------------------------------------------------- table RLS

drop policy "staff manage horses" on public.horses;
create policy "staff manage horses" on public.horses
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy "staff manage reserves" on public.horse_reserves;
create policy "staff manage reserves" on public.horse_reserves
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "staff update auction state" on public.auction_state
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Auction functions now run as the caller, so the policies above decide
-- who may bid or sell. A non-staff caller's updates match no rows.
alter function public.start_auction(uuid)       security invoker;
alter function public.stop_auction()            security invoker;
alter function public.raise_bid(uuid, numeric)  security invoker;
alter function public.place_bid(uuid, numeric)  security invoker;
alter function public.sell_horse(uuid)          security invoker;
alter function public.reopen_horse(uuid)        security invoker;

-- ------------------------------------------------------------- storage

drop policy "staff upload horse photos" on storage.objects;
drop policy "staff update horse photos" on storage.objects;
drop policy "staff delete horse photos" on storage.objects;

create policy "staff read horse photos" on storage.objects
  for select to authenticated using (bucket_id = 'horse-photos' and public.is_staff());
create policy "staff upload horse photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'horse-photos' and public.is_staff());
create policy "staff update horse photos" on storage.objects
  for update to authenticated using (bucket_id = 'horse-photos' and public.is_staff());
create policy "staff delete horse photos" on storage.objects
  for delete to authenticated using (bucket_id = 'horse-photos' and public.is_staff());
