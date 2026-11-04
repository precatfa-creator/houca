-- Arabian horse auction: catalog, private reserves, live auction pointer,
-- bid/sale functions, row-level security, realtime, and photo storage.
--
-- Access model:
--   anon          (public board)   read horses + auction_state only
--   authenticated (admin/manager)  full catalog access; bids/sales only via
--                                  the functions below so concurrent
--                                  operators cannot race each other.

-- ---------------------------------------------------------------- tables

create table public.horses (
  id            uuid primary key default gen_random_uuid(),
  lot           text not null unique check (btrim(lot) <> ''),
  name          text not null check (btrim(name) <> ''),
  color         text not null default '',
  birth_date    date,
  gender        text not null check (gender in ('male', 'female')),
  current_price numeric(12, 2) check (current_price > 0),
  sold_at       timestamptz,
  image_path    text,
  created_at    timestamptz not null default now()
);

-- Kept out of `horses` so the anon key (shipped in the public bundle and
-- used by the board) can never read reserve amounts, including via realtime.
create table public.horse_reserves (
  horse_id uuid primary key references public.horses (id) on delete cascade,
  amount   numeric(12, 2) not null check (amount > 0)
);

-- Single row (id = 1) naming the horse currently on the block.
create table public.auction_state (
  id              smallint primary key default 1 check (id = 1),
  active_horse_id uuid references public.horses (id) on delete set null
);
insert into public.auction_state (id) values (1);

-- ------------------------------------------------------------------- RLS

alter table public.horses         enable row level security;
alter table public.horse_reserves enable row level security;
alter table public.auction_state  enable row level security;

create policy "anyone can read horses" on public.horses
  for select to anon, authenticated using (true);
create policy "staff manage horses" on public.horses
  for all to authenticated using (true) with check (true);

create policy "staff manage reserves" on public.horse_reserves
  for all to authenticated using (true) with check (true);

create policy "anyone can read auction state" on public.auction_state
  for select to anon, authenticated using (true);
-- No write policy: auction_state changes only through the functions below,
-- which run as their owner (security definer).

revoke all on public.horse_reserves from anon;

-- ------------------------------------------------------------- functions
-- Errors are raised with stable message codes the client maps to Arabic.

create function public.start_auction(p_horse_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.horses where id = p_horse_id and sold_at is null) then
    raise exception 'horse_not_available';
  end if;
  update public.auction_state set active_horse_id = p_horse_id where id = 1;
end $$;

create function public.stop_auction()
returns void language sql security definer set search_path = '' as $$
  update public.auction_state set active_horse_id = null where id = 1;
$$;

-- Adds a fixed increment to the current price (starting from 0).
create function public.raise_bid(p_horse_id uuid, p_increment numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
declare v_price numeric;
begin
  if p_increment is null or p_increment <= 0 then
    raise exception 'invalid_amount';
  end if;
  update public.horses h
     set current_price = coalesce(h.current_price, 0) + p_increment
   where h.id = p_horse_id
     and h.sold_at is null
     and h.id = (select active_horse_id from public.auction_state where id = 1)
  returning h.current_price into v_price;
  if not found then raise exception 'horse_not_live'; end if;
  return v_price;
end $$;

-- Sets an explicit new price; must beat the current one.
create function public.place_bid(p_horse_id uuid, p_amount numeric)
returns numeric language plpgsql security definer set search_path = '' as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;
  if not exists (
    select 1 from public.horses h
     where h.id = p_horse_id and h.sold_at is null
       and h.id = (select active_horse_id from public.auction_state where id = 1)
  ) then
    raise exception 'horse_not_live';
  end if;
  update public.horses
     set current_price = p_amount
   where id = p_horse_id and (current_price is null or p_amount > current_price);
  if not found then raise exception 'bid_too_low'; end if;
  return p_amount;
end $$;

-- Marks the live horse sold. Selling below the reserve is allowed on
-- purpose (manager override); the client asks for confirmation first.
create function public.sell_horse(p_horse_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.horses h
     set sold_at = now()
   where h.id = p_horse_id
     and h.sold_at is null
     and h.id = (select active_horse_id from public.auction_state where id = 1);
  if not found then raise exception 'horse_not_live'; end if;
end $$;

-- Undoes a sale and puts the horse back on the block at its last price.
create function public.reopen_horse(p_horse_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.horses set sold_at = null
   where id = p_horse_id and sold_at is not null;
  if not found then raise exception 'horse_not_sold'; end if;
  update public.auction_state set active_horse_id = p_horse_id where id = 1;
end $$;

-- Functions in `public` are executable by everyone by default; the board's
-- anon key must not be able to bid or sell.
revoke execute on function
  public.start_auction(uuid), public.stop_auction(),
  public.raise_bid(uuid, numeric), public.place_bid(uuid, numeric),
  public.sell_horse(uuid), public.reopen_horse(uuid)
  from public, anon;
grant execute on function
  public.start_auction(uuid), public.stop_auction(),
  public.raise_bid(uuid, numeric), public.place_bid(uuid, numeric),
  public.sell_horse(uuid), public.reopen_horse(uuid)
  to authenticated;

-- -------------------------------------------------------------- realtime

alter publication supabase_realtime
  add table public.horses, public.horse_reserves, public.auction_state;

-- --------------------------------------------------------------- storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('horse-photos', 'horse-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy "staff upload horse photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'horse-photos');
create policy "staff update horse photos" on storage.objects
  for update to authenticated using (bucket_id = 'horse-photos');
create policy "staff delete horse photos" on storage.objects
  for delete to authenticated using (bucket_id = 'horse-photos');
