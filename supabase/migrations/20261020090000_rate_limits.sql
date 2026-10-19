-- Request limits for the API (fixed one-minute windows). Keys are "bucket:hash" where the hash is a salted SHA-256 of
-- the client IP computed by the server: no IP is ever stored. Nobody reads the table through the API.

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
comment on table public.rate_limits is 'API request counters per (bucket, hashed IP) and time window. Old rows are purged by rate_limit_hit.';

-- Counts one request; true while the key is within p_max requests in its window. Invalid input never blocks.
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_hits integer;
begin
  if p_key !~ '^[a-z]{1,20}:[0-9a-f]{32}$' or p_window_seconds not between 1 and 3600 or p_max not between 1 and 10000 then
    return true;
  end if;
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  if random() < 0.01 then delete from public.rate_limits where window_start < now() - interval '1 hour'; end if;
  return v_hits <= p_max;
end $$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public;
grant execute on function public.rate_limit_hit(text, integer, integer) to anon, authenticated;
