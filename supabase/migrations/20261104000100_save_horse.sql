-- Atomic horse saves: a horse and its reserve are written in one
-- transaction, so a failure can never leave a horse without its reserve
-- (which would let it sell below the intended minimum).

-- Inserts (no "id") or updates (with "id") one horse and sets its reserve.
-- p_horse: {id?, lot, name, color, birth_date, gender, reserve}; reserve
-- null removes it. Returns the horse id.
create function public.save_horse(p_horse jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid := (p_horse ->> 'id')::uuid;
begin
  if v_id is null then
    insert into public.horses (lot, name, color, birth_date, gender)
    values (btrim(p_horse ->> 'lot'), btrim(p_horse ->> 'name'),
            coalesce(btrim(p_horse ->> 'color'), ''),
            (p_horse ->> 'birth_date')::date, p_horse ->> 'gender')
    returning id into v_id;
  else
    update public.horses
       set lot = btrim(p_horse ->> 'lot'), name = btrim(p_horse ->> 'name'),
           color = coalesce(btrim(p_horse ->> 'color'), ''),
           birth_date = (p_horse ->> 'birth_date')::date, gender = p_horse ->> 'gender'
     where id = v_id;
    if not found then raise exception 'horse_not_found'; end if;
  end if;

  if p_horse ->> 'reserve' is null then
    delete from public.horse_reserves where horse_id = v_id;
  else
    insert into public.horse_reserves (horse_id, amount)
    values (v_id, (p_horse ->> 'reserve')::numeric)
    on conflict (horse_id) do update set amount = excluded.amount;
  end if;
  return v_id;
end $$;

-- Imports many horses all-or-nothing (one function call = one transaction).
create function public.import_horses(p_rows jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_row jsonb;
begin
  for v_row in select * from jsonb_array_elements(p_rows) loop
    perform public.save_horse(v_row - 'id');
  end loop;
  return jsonb_array_length(p_rows);
end $$;

revoke execute on function public.save_horse(jsonb), public.import_horses(jsonb) from public, anon;
grant execute on function public.save_horse(jsonb), public.import_horses(jsonb) to authenticated;
