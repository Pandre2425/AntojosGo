-- Home "most searched" options: daily counters per food concept (shared/contracts/assistant.ts CONCEPTS).
-- Only the concept key is stored (e.g. 'pizza'), never the typed text or who searched. No DROP statements.

create table if not exists public.search_concept_hits (
  day date not null default current_date,
  concept text not null check (concept in ('picante','desayuno','postre','frio','caliente','cafe','pizza','hamburguesa','mexicana',
    'mariscos','carne','pollo','tipico','china','japonesa','vegetariano','vegano','sin_gluten','bebida')),
  hits integer not null default 0 check (hits >= 0),
  primary key (day, concept)
);
alter table public.search_concept_hits enable row level security; -- no policies: only the functions below touch it
revoke all on table public.search_concept_hits from anon, authenticated;

-- Called by the API after a search. Unknown keys are ignored; at most 3 per call.
-- ponytail: anyone with the public key can call it and inflate a category's rank (no personal data at stake).
-- Move the call behind a server-only key or a rate limit if the ranking ever matters commercially.
create or replace function public.record_concept_searches(p_concepts text[])
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.search_concept_hits as h (day, concept, hits)
  select current_date, c, 1 from (
    select distinct c from unnest((coalesce(p_concepts, '{}'::text[]))[1:3]) c
     where c in ('picante','desayuno','postre','frio','caliente','cafe','pizza','hamburguesa','mexicana',
                 'mariscos','carne','pollo','tipico','china','japonesa','vegetariano','vegano','sin_gluten','bebida')) s
  on conflict (day, concept) do update set hits = h.hits + 1
$$;
revoke all on function public.record_concept_searches(text[]) from public;
grant execute on function public.record_concept_searches(text[]) to anon, authenticated;

-- Ranking of the last 30 days.
create or replace function public.popular_concepts()
returns table (concept text, hits bigint) language sql stable security definer set search_path = public, pg_temp as $$
  select concept, sum(hits)::bigint from public.search_concept_hits
   where day > current_date - 30 group by concept order by 2 desc, 1 limit 20
$$;
revoke all on function public.popular_concepts() from public;
grant execute on function public.popular_concepts() to anon, authenticated;
