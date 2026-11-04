-- Realtime still delivered empty-payload events for horse_reserves to anon
-- subscribers, revealing *that* a horse has a reserve (not the amount).
-- Staff screens don't need this channel: every reserve write goes through
-- save_horse / import_horses, which also write the horses row and trigger
-- a refetch via that table's events.
alter publication supabase_realtime drop table public.horse_reserves;
